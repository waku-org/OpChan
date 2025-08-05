import { KeyDelegation } from '../signatures/key-delegation';
import { bytesToHex } from '@/lib/utils';
import { getEnsName } from '@wagmi/core';
import { config } from './appkit';
import { UseAppKitAccountReturn } from '@reown/appkit';



export interface WalletInfo {
  address: string;
  walletType: 'bitcoin' | 'ethereum';
  ensName?: string;
  isConnected: boolean;
}

export interface DelegationInfo {
  browserPublicKey: string;
  signature: string;
  expiryTimestamp: number;
}

export class ReOwnWalletService {
  private keyDelegation: KeyDelegation;
  private bitcoinAccount?: UseAppKitAccountReturn;
  private ethereumAccount?: UseAppKitAccountReturn;

  constructor() {
    this.keyDelegation = new KeyDelegation();
  }

  /**
   * Set account references from AppKit hooks
   */
  setAccounts(bitcoinAccount: UseAppKitAccountReturn, ethereumAccount: UseAppKitAccountReturn) {
    this.bitcoinAccount = bitcoinAccount;
    this.ethereumAccount = ethereumAccount;
  }

  /**
   * Check if a wallet type is available and connected
   */
  isWalletAvailable(walletType: 'bitcoin' | 'ethereum'): boolean {
    if (walletType === 'bitcoin') {
      return this.bitcoinAccount?.isConnected || false;
    } else {
      return this.ethereumAccount?.isConnected || false;
    }
  }

  /**
   * Check if wallet can be connected
   */
  async canConnectWallet(walletType: 'bitcoin' | 'ethereum'): Promise<boolean> {
    // For ReOwn, we assume connection is always possible if AppKit is initialized
    return true;
  }

  /**
   * Get wallet connection info with ENS resolution for Ethereum
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    if (this.bitcoinAccount?.isConnected) {
      return {
        address: this.bitcoinAccount.address,
        walletType: 'bitcoin',
        isConnected: true
      };
    } else if (this.ethereumAccount?.isConnected) {
      // Use Wagmi to resolve ENS name
      let ensName: string | undefined;
      try {
        const resolvedName = await getEnsName(config, {
          address: this.ethereumAccount.address as `0x${string}`
        });
        ensName = resolvedName || undefined;
      } catch (error) {
        console.warn('Failed to resolve ENS name:', error);
        // Continue without ENS name
      }

      return {
        address: this.ethereumAccount.address,
        walletType: 'ethereum',
        ensName,
        isConnected: true
      };
    }
    return null;
  }

  /**
   * Get the active wallet address
   */
  getActiveAddress(): string | null {
    if (this.bitcoinAccount?.isConnected) {
      return this.bitcoinAccount.address;
    } else if (this.ethereumAccount?.isConnected) {
      return this.ethereumAccount.address;
    }
    return null;
  }

  /**
   * Get the active wallet type
   */
  getActiveWalletType(): 'bitcoin' | 'ethereum' | null {
    if (this.bitcoinAccount?.isConnected) {
      return 'bitcoin';
    } else if (this.ethereumAccount?.isConnected) {
      return 'ethereum';
    }
    return null;
  }

  /**
   * Setup key delegation for the connected wallet
   */
  async setupKeyDelegation(
    address: string,
    walletType: 'bitcoin' | 'ethereum'
  ): Promise<DelegationInfo> {
    // Generate browser keypair
    const keypair = this.keyDelegation.generateKeypair();
    
    // Create delegation message with chain-specific format
    const expiryTimestamp = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    const delegationMessage = this.createDelegationMessage(
      keypair.publicKey,
      address,
      walletType,
      expiryTimestamp
    );

    // Get the appropriate account for signing
    const account = walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
    if (!account?.isConnected) {
      throw new Error(`${walletType} wallet is not connected`);
    }

    // Sign the delegation message
    const signature = await this.signMessage(delegationMessage, walletType);
    
    // Create and store delegation
    const delegationInfo = this.keyDelegation.createDelegation(
      address,
      signature,
      keypair.publicKey,
      keypair.privateKey,
      24
    );
    
    this.keyDelegation.storeDelegation(delegationInfo);

    return {
      browserPublicKey: keypair.publicKey,
      signature,
      expiryTimestamp
    };
  }

  /**
   * Create chain-specific delegation message
   */
  private createDelegationMessage(
    browserPublicKey: string,
    address: string,
    walletType: 'bitcoin' | 'ethereum',
    expiryTimestamp: number
  ): string {
    const chainName = walletType === 'bitcoin' ? 'Bitcoin' : 'Ethereum';
    const expiryDate = new Date(expiryTimestamp).toISOString();
    
    return `I, ${address} (${chainName}), delegate authority to this pubkey: ${browserPublicKey} until ${expiryDate}`;
  }

  /**
   * Sign a message with the appropriate wallet
   */
  private async signMessage(message: string, walletType: 'bitcoin' | 'ethereum'): Promise<string> {
    const account = walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
    if (!account?.isConnected) {
      throw new Error(`${walletType} wallet is not connected`);
    }

    // Convert message to bytes for signing
    const messageBytes = new TextEncoder().encode(message);
    
    // Sign with the appropriate wallet
    const signature = await account.signMessage({ message: messageBytes });
    
    // Return hex-encoded signature
    return bytesToHex(signature);
  }

  /**
   * Disconnect wallet (handled by AppKit)
   */
  async disconnectWallet(walletType: 'bitcoin' | 'ethereum'): Promise<void> {
    // Clear stored delegation
    this.keyDelegation.clearDelegation();
    
    // Note: Actual disconnection is handled by AppKit's useDisconnect hook
  }

  /**
   * Check if delegation is valid
   */
  isDelegationValid(): boolean {
    return this.keyDelegation.isDelegationValid();
  }

  /**
   * Get delegation time remaining
   */
  getDelegationTimeRemaining(): number {
    return this.keyDelegation.getDelegationTimeRemaining();
  }

  /**
   * Get the key delegation instance
   */
  getKeyDelegation(): KeyDelegation {
    return this.keyDelegation;
  }
}