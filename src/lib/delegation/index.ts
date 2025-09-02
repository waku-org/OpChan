import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { OpchanMessage } from '@/types/forum';
import { UnsignedMessage } from '@/types/waku';
import { DelegationDuration, DelegationInfo, DelegationStatus } from './types';
import { DelegationStorage } from './storage';

// Set up ed25519 with sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export class DelegationManager {
  // Duration options in hours
  private static readonly DURATION_HOURS = {
    '7days': 24 * 7, // 168 hours
    '30days': 24 * 30, // 720 hours
  } as const;

  /**
   * Get the number of hours for a given duration
   */
  static getDurationHours(duration: DelegationDuration): number {
    return DelegationManager.DURATION_HOURS[duration];
  }

  // ============================================================================
  // KEYPAIR GENERATION
  // ============================================================================

  /**
   * Generate a new browser-based keypair for signing messages
   */
  generateKeypair(): { publicKey: string; privateKey: string } {
    const privateKey = ed.utils.randomPrivateKey();
    const privateKeyHex = bytesToHex(privateKey);

    const publicKey = ed.getPublicKey(privateKey);
    const publicKeyHex = bytesToHex(publicKey);

    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
    };
  }

  /**
   * Create a delegation message to be signed by the wallet
   */
  createDelegationMessage(
    browserPublicKey: string,
    walletAddress: string,
    expiryTimestamp: number
  ): string {
    return `I, ${walletAddress}, delegate authority to this pubkey: ${browserPublicKey} until ${expiryTimestamp}`;
  }

  // ============================================================================
  // DELEGATION LIFECYCLE
  // ============================================================================

  /**
   * Create and store a delegation
   */
  createDelegation(
    walletAddress: string,
    signature: string,
    browserPublicKey: string,
    browserPrivateKey: string,
    duration: DelegationDuration = '7days',
    walletType: 'bitcoin' | 'ethereum'
  ): void {
    const expiryHours = DelegationManager.getDurationHours(duration);
    const expiryTimestamp = Date.now() + expiryHours * 60 * 60 * 1000;

    const delegationInfo: DelegationInfo = {
      signature,
      expiryTimestamp,
      browserPublicKey,
      browserPrivateKey,
      walletAddress,
      walletType,
    };

    DelegationStorage.store(delegationInfo);
  }

  /**
   * Check if a delegation is valid
   */
  isDelegationValid(
    currentAddress?: string,
    currentWalletType?: 'bitcoin' | 'ethereum'
  ): boolean {
    const delegation = DelegationStorage.retrieve();
    if (!delegation) return false;

    // Check if delegation has expired
    const now = Date.now();
    if (now >= delegation.expiryTimestamp) return false;

    // If a current address is provided, validate it matches the delegation
    if (currentAddress && delegation.walletAddress !== currentAddress) {
      return false;
    }

    // If a current wallet type is provided, validate it matches the delegation
    if (currentWalletType && delegation.walletType !== currentWalletType) {
      return false;
    }

    return true;
  }

  /**
   * Get the time remaining on the current delegation in milliseconds
   */
  getDelegationTimeRemaining(): number {
    const delegation = DelegationStorage.retrieve();
    if (!delegation) return 0;

    const now = Date.now();
    return Math.max(0, delegation.expiryTimestamp - now);
  }

  /**
   * Get the browser public key from the current delegation
   */
  getBrowserPublicKey(): string | null {
    const delegation = DelegationStorage.retrieve();
    if (!delegation) return null;
    return delegation.browserPublicKey;
  }

  /**
   * Get delegation status
   */
  getDelegationStatus(
    currentAddress?: string,
    currentWalletType?: 'bitcoin' | 'ethereum'
  ): DelegationStatus {
    const hasDelegation = this.getBrowserPublicKey() !== null;
    const isValid = this.isDelegationValid(currentAddress, currentWalletType);
    const timeRemaining = this.getDelegationTimeRemaining();

    return {
      hasDelegation,
      isValid,
      timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
    };
  }

  /**
   * Clear the stored delegation
   */
  clearDelegation(): void {
    DelegationStorage.clear();
  }

  // ============================================================================
  // MESSAGE SIGNING & VERIFICATION
  // ============================================================================

  /**
   * Sign a raw string message using the browser-generated private key
   */
  signRawMessage(message: string): string | null {
    const delegation = DelegationStorage.retrieve();
    if (!delegation || !this.isDelegationValid()) return null;

    try {
      const privateKeyBytes = hexToBytes(delegation.browserPrivateKey);
      const messageBytes = new TextEncoder().encode(message);

      const signature = ed.sign(messageBytes, privateKeyBytes);
      return bytesToHex(signature);
    } catch (error) {
      console.error('Error signing with browser key:', error);
      return null;
    }
  }

  /**
   * Sign an unsigned message with the delegated browser key
   */
  signMessageWithDelegatedKey(message: UnsignedMessage): OpchanMessage | null {
    if (!this.isDelegationValid()) {
      console.error('No valid key delegation found. Cannot sign message.');
      return null;
    }

    const delegation = DelegationStorage.retrieve();
    if (!delegation) return null;

    // Create the message content to sign (without signature fields)
    const messageToSign = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
    });

    const signature = this.signRawMessage(messageToSign);
    if (!signature) return null;

    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey,
    } as OpchanMessage;
  }

  /**
   * Verify an OpchanMessage signature
   */
  verifyMessage(message: OpchanMessage): boolean {
    // Check for required signature fields
    if (!message.signature || !message.browserPubKey) {
      const messageId = message.id || `${message.type}-${message.timestamp}`;
      console.warn('Message is missing signature information', messageId);
      return false;
    }

    // Reconstruct the original signed content
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
    });

    // Verify the signature
    const isValid = this.verifyRawSignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );

    if (!isValid) {
      const messageId = message.id || `${message.type}-${message.timestamp}`;
      console.warn(`Invalid signature for message ${messageId}`);
    }

    return isValid;
  }

  /**
   * Verify a signature made with the browser key
   */
  private verifyRawSignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = hexToBytes(signature);
      const publicKeyBytes = hexToBytes(publicKey);

      return ed.verify(signatureBytes, messageBytes, publicKeyBytes);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const delegationManager = new DelegationManager();
export * from './types';
export { DelegationStorage };
