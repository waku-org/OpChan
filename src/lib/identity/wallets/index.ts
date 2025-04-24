import { PhantomWalletAdapter } from './phantom';
import { KeyDelegation } from '../signatures/key-delegation';
import { DelegationInfo } from '../signatures/types';

export type WalletType = 'phantom';

export interface WalletInfo {
  address: string;
  type: WalletType;
  delegated: boolean;
  delegationExpiry?: number;
}

/**
 * Service for managing wallet connections and key delegation
 */
export class WalletService {
  // Default delegation validity period: 24 hours
  private static readonly DEFAULT_DELEGATION_PERIOD = 24 * 60 * 60 * 1000;
  
  private keyDelegation: KeyDelegation;
  private phantomAdapter: PhantomWalletAdapter;
  
  constructor() {
    this.keyDelegation = new KeyDelegation();
    this.phantomAdapter = new PhantomWalletAdapter();
  }
  
  /**
   * Checks if a specific wallet type is available in the browser
   */
  public isWalletAvailable(type: WalletType): boolean {
    return this.phantomAdapter.isInstalled();
  }
  
  /**
   * Connect to a specific wallet type
   * @param type The wallet type to connect to
   * @returns Promise resolving to the wallet's address
   */
  public async connectWallet(type: WalletType = 'phantom'): Promise<string> {
    return await this.phantomAdapter.connect();
  }
  
  /**
   * Disconnect the current wallet
   * @param type The wallet type to disconnect
   */
  public async disconnectWallet(type: WalletType): Promise<void> {
    this.keyDelegation.clearDelegation(); // Clear any delegation
    await this.phantomAdapter.disconnect();
  }
  
  /**
   * Get the current wallet information from local storage
   * @returns The current wallet info or null if not connected
   */
  public getWalletInfo(): WalletInfo | null {
    const userJson = localStorage.getItem('opchan-user');
    if (!userJson) return null;
    
    try {
      const user = JSON.parse(userJson);
      const delegation = this.keyDelegation.retrieveDelegation();
      
      return {
        address: user.address,
        type: 'phantom',
        delegated: !!delegation && this.keyDelegation.isDelegationValid(),
        delegationExpiry: delegation?.expiryTimestamp
      };
    } catch (e) {
      console.error('Failed to parse user data', e);
      return null;
    }
  }
  
  /**
   * Set up key delegation for the connected wallet
   * @param bitcoinAddress The Bitcoin address to delegate from
   * @param walletType The wallet type
   * @param validityPeriod Milliseconds the delegation should be valid for
   * @returns Promise resolving to the delegation info
   */
  public async setupKeyDelegation(
    bitcoinAddress: string,
    walletType: WalletType,
    validityPeriod: number = WalletService.DEFAULT_DELEGATION_PERIOD
  ): Promise<Omit<DelegationInfo, 'browserPrivateKey'>> {
    // Generate browser keypair
    const keypair = this.keyDelegation.generateKeypair();
    
    // Calculate expiry in hours
    const expiryHours = validityPeriod / (60 * 60 * 1000);
    
    // Create delegation message
    const delegationMessage = this.keyDelegation.createDelegationMessage(
      keypair.publicKey,
      bitcoinAddress,
      Date.now() + validityPeriod
    );
    
    // Sign the delegation message with the Bitcoin wallet
    const signature = await this.phantomAdapter.signMessage(delegationMessage);
    
    // Create and store the delegation
    const delegationInfo = this.keyDelegation.createDelegation(
      bitcoinAddress,
      signature,
      keypair.publicKey,
      keypair.privateKey,
      expiryHours
    );
    
    this.keyDelegation.storeDelegation(delegationInfo);
    
    // Return delegation info (excluding private key)
    return {
      signature,
      expiryTimestamp: delegationInfo.expiryTimestamp,
      browserPublicKey: keypair.publicKey,
      bitcoinAddress
    };
  }
  
  /**
   * Signs a message using the delegated browser key
   * @param message The message to sign
   * @returns Promise resolving to the signature or null if no valid delegation
   */
  public async signMessage(message: string): Promise<string | null> {
    return this.keyDelegation.signMessage(message);
  }
  
  /**
   * Verifies a message signature against a public key
   * @param message The original message
   * @param signature The signature to verify
   * @param publicKey The public key to verify against
   * @returns Promise resolving to a boolean indicating if the signature is valid
   */
  public async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    return this.keyDelegation.verifySignature(message, signature, publicKey);
  }
  
  /**
   * Checks if the current key delegation is valid
   * @returns boolean indicating if the delegation is valid
   */
  public isDelegationValid(): boolean {
    return this.keyDelegation.isDelegationValid();
  }
  
  /**
   * Gets the time remaining on the current delegation
   * @returns Time remaining in milliseconds, or 0 if expired/no delegation
   */
  public getDelegationTimeRemaining(): number {
    return this.keyDelegation.getDelegationTimeRemaining();
  }
  
  /**
   * Clears the stored delegation
   */
  public clearDelegation(): void {
    this.keyDelegation.clearDelegation();
  }
} 