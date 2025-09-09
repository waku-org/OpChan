import { OpchanMessage } from '@/types/forum';
import { UnsignedMessage } from '@/types/waku';
import {
  DelegationDuration,
  DelegationInfo,
  DelegationStatus,
  DelegationProof,
} from './types';
import { DelegationStorage } from './storage';
import { DelegationCrypto } from './crypto';

export interface DelegationFullStatus extends DelegationStatus {
  publicKey?: string;
  address?: string;
  walletType?: 'bitcoin' | 'ethereum';
}

export class DelegationManager {
  private cachedDelegation: DelegationInfo | null = null;
  private cachedAt: number = 0;
  private static readonly CACHE_TTL_MS = 5 * 1000; // 5s to avoid hot-looping
  private static readonly DURATION_HOURS = {
    '7days': 24 * 7,
    '30days': 24 * 30,
  } as const;

  static getDurationHours(duration: DelegationDuration): number {
    return DelegationManager.DURATION_HOURS[duration];
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Create a delegation with cryptographic proof
   */
  async delegate(
    address: string,
    walletType: 'bitcoin' | 'ethereum',
    duration: DelegationDuration = '7days',
    signFunction: (message: string) => Promise<string>
  ): Promise<boolean> {
    try {
      // Generate browser keypair
      const keypair = DelegationCrypto.generateKeypair();

      // Create expiry and nonce
      const expiryTimestamp =
        Date.now() +
        DelegationManager.getDurationHours(duration) * 60 * 60 * 1000;
      const nonce = crypto.randomUUID();

      // Create and sign authorization message
      const authMessage = DelegationCrypto.createAuthMessage(
        keypair.publicKey,
        address,
        expiryTimestamp,
        nonce
      );
      const walletSignature = await signFunction(authMessage);

      // Store delegation
      const delegationInfo: DelegationInfo = {
        authMessage,
        walletSignature,
        expiryTimestamp,
        walletAddress: address,
        walletType,
        browserPublicKey: keypair.publicKey,
        browserPrivateKey: keypair.privateKey,
        nonce,
      };

      await DelegationStorage.store(delegationInfo);
      return true;
    } catch (error) {
      console.error('Error creating delegation:', error);
      return false;
    }
  }

  /**
   * Sign a message with delegated key
   */
  async signMessage(message: UnsignedMessage): Promise<OpchanMessage | null> {
    const now = Date.now();
    if (
      !this.cachedDelegation ||
      now - this.cachedAt > DelegationManager.CACHE_TTL_MS
    ) {
      this.cachedDelegation = await DelegationStorage.retrieve();
      this.cachedAt = now;
    }
    const delegation = this.cachedDelegation;
    if (!delegation || Date.now() >= delegation.expiryTimestamp) {
      return null;
    }

    // Sign message content
    const messageToSign = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
      delegationProof: undefined,
    });

    const signature = DelegationCrypto.signRaw(
      messageToSign,
      delegation.browserPrivateKey
    );
    if (!signature) return null;

    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey,
      delegationProof: this.createProof(delegation),
    } as OpchanMessage;
  }

  /**
   * Verify a signed message
   */
  async verify(message: OpchanMessage): Promise<boolean> {
    // Check required fields
    if (
      !message.signature ||
      !message.browserPubKey ||
      !message.delegationProof ||
      !message.author
    ) {
      return false;
    }

    // Verify message signature
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
      delegationProof: undefined,
    });

    if (
      !DelegationCrypto.verifyRaw(
        signedContent,
        message.signature,
        message.browserPubKey
      )
    ) {
      return false;
    }

    // Verify delegation proof
    return await this.verifyProof(
      message.delegationProof,
      message.browserPubKey,
      message.author
    );
  }

  /**
   * Get delegation status
   */
  async getStatus(
    currentAddress?: string,
    currentWalletType?: 'bitcoin' | 'ethereum'
  ): Promise<DelegationFullStatus> {
    const now = Date.now();
    if (
      !this.cachedDelegation ||
      now - this.cachedAt > DelegationManager.CACHE_TTL_MS
    ) {
      this.cachedDelegation = await DelegationStorage.retrieve();
      this.cachedAt = now;
    }
    const delegation = this.cachedDelegation;
    if (!delegation) {
      return { hasDelegation: false, isValid: false };
    }

    const hasExpired = now >= delegation.expiryTimestamp;
    const addressMatches =
      !currentAddress || delegation.walletAddress === currentAddress;
    const walletTypeMatches =
      !currentWalletType || delegation.walletType === currentWalletType;
    const isValid = !hasExpired && addressMatches && walletTypeMatches;

    return {
      hasDelegation: true,
      isValid,
      timeRemaining: isValid
        ? Math.max(0, delegation.expiryTimestamp - now)
        : undefined,
      publicKey: delegation.browserPublicKey,
      address: delegation.walletAddress,
      walletType: delegation.walletType,
      proof: isValid ? this.createProof(delegation) : undefined,
    };
  }

  /**
   * Clear stored delegation
   */
  async clear(): Promise<void> {
    await DelegationStorage.clear();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Create delegation proof from stored info
   */
  private createProof(delegation: DelegationInfo): DelegationProof {
    return {
      authMessage: delegation.authMessage,
      walletSignature: delegation.walletSignature,
      expiryTimestamp: delegation.expiryTimestamp,
      walletAddress: delegation.walletAddress,
      walletType: delegation.walletType,
    };
  }

  /**
   * Verify delegation proof
   */
  private async verifyProof(
    proof: DelegationProof,
    expectedBrowserKey: string,
    expectedWalletAddress: string
  ): Promise<boolean> {
    // Basic validation
    if (
      !proof?.walletAddress ||
      !proof?.authMessage ||
      proof?.expiryTimestamp === undefined ||
      proof.walletAddress !== expectedWalletAddress ||
      Date.now() >= proof.expiryTimestamp
    ) {
      return false;
    }

    // Verify auth message format
    if (
      !proof.authMessage.includes(expectedWalletAddress) ||
      !proof.authMessage.includes(expectedBrowserKey) ||
      !proof.authMessage.includes(proof.expiryTimestamp.toString())
    ) {
      return false;
    }

    // Verify wallet signature
    return await DelegationCrypto.verifyWalletSignature(
      proof.authMessage,
      proof.walletSignature,
      proof.walletAddress,
      proof.walletType
    );
  }
}

// Export singleton instance
export const delegationManager = new DelegationManager();
export * from './types';
export { DelegationStorage };
