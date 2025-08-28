/**
 * CryptoService - Unified cryptographic operations
 * 
 * Combines key delegation and message signing functionality into a single,
 * cohesive service focused on all cryptographic operations.
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { LOCAL_STORAGE_KEYS } from '@/lib/waku/constants';
import { OpchanMessage } from '@/types/forum';

export interface DelegationSignature {
    signature: string;      // Signature from wallet
    expiryTimestamp: number; // When this delegation expires
    browserPublicKey: string; // Browser-generated public key that was delegated to
    walletAddress: string;   // Wallet address that signed the delegation
    walletType: 'bitcoin' | 'ethereum'; // Type of wallet that created the delegation
  }
  
  export interface DelegationInfo extends DelegationSignature {
    browserPrivateKey: string;
  }

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export type DelegationDuration = '7days' | '30days';

export interface CryptoServiceInterface {
  // Delegation management
  createDelegation(
    walletAddress: string,
    signature: string,
    browserPublicKey: string,
    browserPrivateKey: string,
    duration: DelegationDuration,
    walletType: 'bitcoin' | 'ethereum'
  ): void;
  isDelegationValid(currentAddress?: string, currentWalletType?: 'bitcoin' | 'ethereum'): boolean;
  getDelegationTimeRemaining(): number;
  getBrowserPublicKey(): string | null;
  clearDelegation(): void;
  
  // Keypair generation
  generateKeypair(): { publicKey: string; privateKey: string };
  createDelegationMessage(browserPublicKey: string, walletAddress: string, expiryTimestamp: number): string;
  
  // Message operations
  signMessage<T extends OpchanMessage>(message: T): T | null;
  verifyMessage(message: OpchanMessage): boolean;
}

export class CryptoService implements CryptoServiceInterface {
  private static readonly STORAGE_KEY = LOCAL_STORAGE_KEYS.KEY_DELEGATION;
  
  // Duration options in hours
  private static readonly DURATION_HOURS = {
    '7days': 24 * 7,    // 168 hours
    '30days': 24 * 30   // 720 hours
  } as const;

  /**
   * Get the number of hours for a given duration
   */
  static getDurationHours(duration: DelegationDuration): number {
    return CryptoService.DURATION_HOURS[duration];
  }

  /**
   * Get available duration options
   */
  static getAvailableDurations(): DelegationDuration[] {
    return Object.keys(CryptoService.DURATION_HOURS) as DelegationDuration[];
  }

  // ============================================================================
  // KEYPAIR GENERATION
  // ============================================================================

  /**
   * Generates a new browser-based keypair for signing messages
   */
  generateKeypair(): { publicKey: string; privateKey: string } {
    const privateKey = ed.utils.randomPrivateKey();
    const privateKeyHex = bytesToHex(privateKey);
    
    const publicKey = ed.getPublicKey(privateKey);
    const publicKeyHex = bytesToHex(publicKey);
    
    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex
    };
  }

  /**
   * Creates a delegation message to be signed by the wallet
   */
  createDelegationMessage(
    browserPublicKey: string,
    walletAddress: string,
    expiryTimestamp: number
  ): string {
    return `I, ${walletAddress}, delegate authority to this pubkey: ${browserPublicKey} until ${expiryTimestamp}`;
  }

  // ============================================================================
  // DELEGATION MANAGEMENT
  // ============================================================================

  /**
   * Creates and stores a delegation
   */
  createDelegation(
    walletAddress: string,
    signature: string,
    browserPublicKey: string,
    browserPrivateKey: string,
    duration: DelegationDuration = '7days',
    walletType: 'bitcoin' | 'ethereum'
  ): void {
    const expiryHours = CryptoService.getDurationHours(duration);
    const expiryTimestamp = Date.now() + (expiryHours * 60 * 60 * 1000);
    
    const delegationInfo: DelegationInfo = {
      signature,
      expiryTimestamp,
      browserPublicKey,
      browserPrivateKey,
      walletAddress,
      walletType
    };

    localStorage.setItem(CryptoService.STORAGE_KEY, JSON.stringify(delegationInfo));
  }

  /**
   * Retrieves delegation information from local storage
   */
  private retrieveDelegation(): DelegationInfo | null {
    const delegationJson = localStorage.getItem(CryptoService.STORAGE_KEY);
    if (!delegationJson) return null;
    
    try {
      return JSON.parse(delegationJson);
    } catch (e) {
      console.error('Failed to parse delegation information', e);
      return null;
    }
  }

  /**
   * Checks if a delegation is valid
   */
  isDelegationValid(currentAddress?: string, currentWalletType?: 'bitcoin' | 'ethereum'): boolean {
    const delegation = this.retrieveDelegation();
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
   * Gets the time remaining on the current delegation
   */
  getDelegationTimeRemaining(): number {
    const delegation = this.retrieveDelegation();
    if (!delegation) return 0;
    
    const now = Date.now();
    return Math.max(0, delegation.expiryTimestamp - now);
  }

  /**
   * Gets the browser public key from the current delegation
   */
  getBrowserPublicKey(): string | null {
    const delegation = this.retrieveDelegation();
    if (!delegation) return null;
    return delegation.browserPublicKey;
  }

  /**
   * Clears the stored delegation
   */
  clearDelegation(): void {
    localStorage.removeItem(CryptoService.STORAGE_KEY);
  }

  // ============================================================================
  // MESSAGE SIGNING & VERIFICATION
  // ============================================================================

  /**
   * Signs a raw string message using the browser-generated private key
   */
  signRawMessage(message: string): string | null {
    const delegation = this.retrieveDelegation();
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
   * Verifies a signature made with the browser key
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

  /**
   * Signs an OpchanMessage with the delegated browser key
   */
  signMessage<T extends OpchanMessage>(message: T): T | null {
    if (!this.isDelegationValid()) {
      console.error('No valid key delegation found. Cannot sign message.');
      return null;
    }
    
    const delegation = this.retrieveDelegation();
    if (!delegation) return null;
    
    // Create the message content to sign (without signature fields)
    const messageToSign = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined
    });
    
    const signature = this.signRawMessage(messageToSign);
    if (!signature) return null;
    
    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey
    };
  }

  /**
   * Verifies an OpchanMessage signature
   */
  verifyMessage(message: OpchanMessage): boolean {
    // Check for required signature fields
    if (!message.signature || !message.browserPubKey) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn('Message is missing signature information', messageId);
      return false;
    }
    
    // Reconstruct the original signed content
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined
    });
    
    // Verify the signature
    const isValid = this.verifyRawSignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );
    
    if (!isValid) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn(`Invalid signature for message ${messageId}`);
    }
    
    return isValid;
  }
}
