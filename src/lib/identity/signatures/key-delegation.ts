/**
 * Key delegation for Bitcoin wallets
 * 
 * This module handles the creation of browser-based keypairs and
 * delegation of signing authority from Bitcoin wallets to these keypairs.
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { LOCAL_STORAGE_KEYS } from '@/lib/waku/constants';
import { DelegationInfo } from './types';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export type DelegationDuration = '7days' | '30days';

export class KeyDelegation {
  private static readonly DEFAULT_EXPIRY_HOURS = 24;
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
    return KeyDelegation.DURATION_HOURS[duration];
  }
  
  /**
   * Get available duration options
   */
  static getAvailableDurations(): DelegationDuration[] {
    return Object.keys(KeyDelegation.DURATION_HOURS) as DelegationDuration[];
  }
  
  /**
   * Generates a new browser-based keypair for signing messages
   * @returns Promise with keypair object containing hex-encoded public and private keys
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
   * @param browserPublicKey The browser-generated public key
   * @param walletAddress The user's wallet address
   * @param expiryTimestamp When the delegation will expire
   * @returns The message to be signed
   */
  createDelegationMessage(
    browserPublicKey: string,
    walletAddress: string,
    expiryTimestamp: number
  ): string {
    return `I, ${walletAddress}, delegate authority to this pubkey: ${browserPublicKey} until ${expiryTimestamp}`;
  }

  /**
   * Creates a delegation object from the signed message
   * @param walletAddress The wallet address that signed the delegation
   * @param signature The signature from the wallet
   * @param browserPublicKey The browser-generated public key
   * @param browserPrivateKey The browser-generated private key
   * @param duration The duration of the delegation ('1week' or '30days')
   * @param walletType The type of wallet (bitcoin or ethereum)
   * @param walletPublicKey The public key of the wallet (for signature verification)
   * @returns DelegationInfo object
   */
  createDelegation(
    walletAddress: string,
    signature: string,
    browserPublicKey: string,
    browserPrivateKey: string,
    duration: DelegationDuration = '7days',
    walletType: 'bitcoin' | 'ethereum',
    walletPublicKey?: string
  ): DelegationInfo {
    const expiryHours = KeyDelegation.getDurationHours(duration);
    const expiryTimestamp = Date.now() + (expiryHours * 60 * 60 * 1000);
    
    return {
      signature,
      expiryTimestamp,
      browserPublicKey,
      browserPrivateKey,
      walletAddress,
      walletType,
      walletPublicKey
    };
  }
  
  /**
   * Stores delegation information in local storage
   * @param delegationInfo The delegation information to store
   */
  storeDelegation(delegationInfo: DelegationInfo): void {
    localStorage.setItem(KeyDelegation.STORAGE_KEY, JSON.stringify(delegationInfo));
  }
  
  /**
   * Retrieves delegation information from local storage
   * @returns The stored delegation information or null if not found
   */
  retrieveDelegation(): DelegationInfo | null {
    const delegationJson = localStorage.getItem(KeyDelegation.STORAGE_KEY);
    if (!delegationJson) return null;
    
    try {
      return JSON.parse(delegationJson);
    } catch (e) {
      console.error('Failed to parse delegation information', e);
      return null;
    }
  }
  
  /**
   * Checks if a delegation is valid (exists, not expired, and matches current wallet)
   * @param currentAddress Optional current wallet address to validate against
   * @param currentWalletType Optional current wallet type to validate against
   * @returns boolean indicating if the delegation is valid
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
   * Signs a message using the browser-generated private key
   * @param message The message to sign
   * @returns Promise resolving to the signature as a hex string, or null if no valid delegation
   */
  signMessage(message: string): string | null {
    const delegation = this.retrieveDelegation();
    if (!delegation || !this.isDelegationValid()) return null;
    
    try {
      const privateKeyBytes = hexToBytes(delegation.browserPrivateKey);
      const messageBytes = new TextEncoder().encode(message);
      
      const signature =  ed.sign(messageBytes, privateKeyBytes);
      return bytesToHex(signature);
    } catch (error) {
      console.error('Error signing with browser key:', error);
      return null;
    }
  }
  
  /**
   * Verifies a signature made with the browser key
   * @param message The original message
   * @param signature The signature to verify (hex string)
   * @param publicKey The public key to verify against (hex string)
   * @returns Promise resolving to a boolean indicating if the signature is valid
   */
  verifySignature(
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
   * Gets the current delegation's Bitcoin address, if available
   * @returns The Bitcoin address or null if no valid delegation exists
   */
  getDelegatingAddress(): string | null {
    const delegation = this.retrieveDelegation();
    if (!delegation || !this.isDelegationValid()) return null;
    return delegation.walletAddress;
  }
  
  /**
   * Gets the browser public key from the current delegation
   * @returns The browser public key or null if no valid delegation exists
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
    localStorage.removeItem(KeyDelegation.STORAGE_KEY);
  }
  
  /**
   * Gets the time remaining on the current delegation
   * @returns Time remaining in milliseconds, or 0 if expired/no delegation
   */
  getDelegationTimeRemaining(): number {
    const delegation = this.retrieveDelegation();
    if (!delegation) return 0;
    
    const now = Date.now();
    return Math.max(0, delegation.expiryTimestamp - now);
  }
} 