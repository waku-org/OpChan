import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { OpchanMessage } from '@/types/forum';
import { UnsignedMessage } from '@/types/waku';
import { DelegationDuration, DelegationInfo, DelegationStatus } from './types';
import { DelegationStorage } from './storage';

// Set up ed25519 with sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Enhanced status interface that consolidates all delegation information
export interface DelegationFullStatus extends DelegationStatus {
  publicKey?: string;
  address?: string;
  walletType?: 'bitcoin' | 'ethereum';
}

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
  // PUBLIC API
  // ============================================================================

  /**
   * Create a complete delegation with a single method call
   * @param address - Wallet address to delegate from
   * @param walletType - Type of wallet (bitcoin/ethereum)
   * @param duration - How long the delegation should last
   * @param signFunction - Function to sign the delegation message with the wallet
   * @returns Promise<boolean> - Success status
   */
  async delegate(
    address: string,
    walletType: 'bitcoin' | 'ethereum',
    duration: DelegationDuration = '7days',
    signFunction: (message: string) => Promise<string>
  ): Promise<boolean> {
    try {
      // Generate new keypair
      const keypair = this.generateKeypair();
      
      // Create delegation message with expiry
      const expiryHours = DelegationManager.getDurationHours(duration);
      const expiryTimestamp = Date.now() + expiryHours * 60 * 60 * 1000;
      const delegationMessage = this.createDelegationMessage(
        keypair.publicKey,
        address,
        expiryTimestamp
      );

      // Sign the delegation message with wallet
      const signature = await signFunction(delegationMessage);

      // Create and store the delegation
      const delegationInfo: DelegationInfo = {
        signature,
        expiryTimestamp,
        browserPublicKey: keypair.publicKey,
        browserPrivateKey: keypair.privateKey,
        walletAddress: address,
        walletType,
      };

      DelegationStorage.store(delegationInfo);
      return true;
    } catch (error) {
      console.error('Error creating delegation:', error);
      return false;
    }
  }

  /**
   * Get comprehensive delegation status
   * @param currentAddress - Optional address to validate against
   * @param currentWalletType - Optional wallet type to validate against
   * @returns Complete delegation status information
   */
  getStatus(
    currentAddress?: string,
    currentWalletType?: 'bitcoin' | 'ethereum'
  ): DelegationFullStatus {
    const delegation = DelegationStorage.retrieve();
    
    if (!delegation) {
      return {
        hasDelegation: false,
        isValid: false,
      };
    }

    // Check if delegation has expired
    const now = Date.now();
    const hasExpired = now >= delegation.expiryTimestamp;
    
    // Check address/wallet type matching if provided
    const addressMatches = !currentAddress || delegation.walletAddress === currentAddress;
    const walletTypeMatches = !currentWalletType || delegation.walletType === currentWalletType;
    
    const isValid = !hasExpired && addressMatches && walletTypeMatches;
    const timeRemaining = Math.max(0, delegation.expiryTimestamp - now);

    return {
      hasDelegation: true,
      isValid,
      timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
      publicKey: delegation.browserPublicKey,
      address: delegation.walletAddress,
      walletType: delegation.walletType,
    };
  }

  /**
   * Clear the stored delegation
   */
  clear(): void {
    DelegationStorage.clear();
  }

  /**
   * Sign a message with the delegated browser key
   * @param message - Unsigned message to sign
   * @returns Signed message or null if delegation invalid
   */
  signMessage(message: UnsignedMessage): OpchanMessage | null {
    const status = this.getStatus();
    if (!status.isValid) {
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

    const signature = this.signRaw(messageToSign);
    if (!signature) return null;

    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey,
    } as OpchanMessage;
  }

  /**
   * Verify a message signature
   * @param message - Signed message to verify
   * @returns True if signature is valid
   */
  verify(message: OpchanMessage): boolean {
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
    const isValid = this.verifyRaw(
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

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generate a new browser-based keypair for signing messages
   */
  private generateKeypair(): { publicKey: string; privateKey: string } {
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
  private createDelegationMessage(
    browserPublicKey: string,
    walletAddress: string,
    expiryTimestamp: number
  ): string {
    return `I, ${walletAddress}, delegate authority to this pubkey: ${browserPublicKey} until ${expiryTimestamp}`;
  }

  /**
   * Sign a raw string message using the browser-generated private key
   */
  private signRaw(message: string): string | null {
    const delegation = DelegationStorage.retrieve();
    if (!delegation) return null;

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
   * Verify a signature made with the browser key
   */
  private verifyRaw(
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
