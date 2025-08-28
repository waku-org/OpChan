import { UseAppKitAccountReturn } from '@reown/appkit/react';
import { CryptoService, DelegationDuration } from '../services/CryptoService';
import { AppKit } from '@reown/appkit';
import { getEnsName } from '@wagmi/core';
import { ChainNamespace } from '@reown/appkit-common';
import { config } from './appkit';
import { Provider} from '@reown/appkit-controllers';

export interface WalletInfo {
  address: string;
  walletType: 'bitcoin' | 'ethereum';
  ensName?: string;
  isConnected: boolean;
}

export class ReOwnWalletService {
  private cryptoService: CryptoService;
  private bitcoinAccount?: UseAppKitAccountReturn;
  private ethereumAccount?: UseAppKitAccountReturn;
  private appKit?: AppKit;

  constructor() {
    this.cryptoService = new CryptoService();
  }

  /**
   * Set account references from AppKit hooks
   */
  setAccounts(bitcoinAccount: UseAppKitAccountReturn, ethereumAccount: UseAppKitAccountReturn) {
    this.bitcoinAccount = bitcoinAccount;
    this.ethereumAccount = ethereumAccount;
  }

  /**
   * Set the AppKit instance for accessing adapters
   */
  setAppKit(appKit: AppKit) {
    this.appKit = appKit;
  }

  /**
   * Check if a wallet type is available and connected
   */
  isWalletAvailable(walletType: 'bitcoin' | 'ethereum'): boolean {
    if (walletType === 'bitcoin') {
      return this.bitcoinAccount?.isConnected ?? false;
    } else {
      return this.ethereumAccount?.isConnected ?? false;
    }
  }

  /**
   * Get the active account based on wallet type
   */
  private getActiveAccount(walletType: 'bitcoin' | 'ethereum'): UseAppKitAccountReturn | undefined {
    return walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
  }

  /**
   * Get the active address for a given wallet type
   */
  getActiveAddress(walletType: 'bitcoin' | 'ethereum'): string | undefined {
    const account = this.getActiveAccount(walletType);
    return account?.address;
  }

  /**
   * Get the appropriate namespace for the wallet type
   */
  private getNamespace(walletType: 'bitcoin' | 'ethereum'): ChainNamespace {
    return walletType === 'bitcoin' ? 'bip122' : 'eip155';
  }

  /**
   * Sign a message using the appropriate adapter
   */
  async signMessage(messageBytes: Uint8Array, walletType: 'bitcoin' | 'ethereum'): Promise<string> {
    if (!this.appKit) {
      throw new Error('AppKit instance not set. Call setAppKit() first.');
    }

    const account = this.getActiveAccount(walletType);
    if (!account?.address) {
      throw new Error(`No ${walletType} wallet connected`);
    }

    const namespace = this.getNamespace(walletType);
    
    // Convert message bytes to string for signing
    const messageString = new TextDecoder().decode(messageBytes);

    try {
      // Access the adapter through the appKit instance
      // The adapter is available through the appKit's chainAdapters property
      const adapter = this.appKit.chainAdapters?.[namespace];
      
      if (!adapter) {
        throw new Error(`No adapter found for namespace: ${namespace}`);
      }

      // Get the provider for the current connection
      const provider = this.appKit.getProvider(namespace);
      
      if (!provider) {
        throw new Error(`No provider found for namespace: ${namespace}`);
      }

      // Call the adapter's signMessage method
      const result = await adapter.signMessage({
        message: messageString,
        address: account.address,
        provider: provider as Provider 
      });

      return result.signature;
    } catch (error) {
      console.error(`Error signing message with ${walletType} wallet:`, error);
      throw new Error(`Failed to sign message with ${walletType} wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a key delegation for the connected wallet
   */
  async createKeyDelegation(walletType: 'bitcoin' | 'ethereum', duration: DelegationDuration = '7days'): Promise<boolean> {
    try {
      const account = this.getActiveAccount(walletType);
      if (!account?.address) {
        throw new Error(`No ${walletType} wallet connected`);
      }

      // Generate a new browser keypair
      const keypair = this.cryptoService.generateKeypair();
      
      // Create delegation message with expiry
      const expiryHours = CryptoService.getDurationHours(duration);
      const expiryTimestamp = Date.now() + (expiryHours * 60 * 60 * 1000);
      const delegationMessage = this.cryptoService.createDelegationMessage(
        keypair.publicKey,
        account.address,
        expiryTimestamp
      );
      
      const messageBytes = new TextEncoder().encode(delegationMessage);

      // Sign the delegation message
      const signature = await this.signMessage(messageBytes, walletType);

      // Create and store the delegation
      this.cryptoService.createDelegation(
        account.address,
        signature,
        keypair.publicKey,
        keypair.privateKey,
        duration,
        walletType
      );

      return true;
    } catch (error) {
      console.error(`Error creating key delegation for ${walletType}:`, error);
      return false;
    }
  }

  /**
   * Sign a message using the delegated key (if available) or fall back to wallet signing
   */
  async signMessageWithDelegation(messageBytes: Uint8Array, walletType: 'bitcoin' | 'ethereum'): Promise<string> {
    const account = this.getActiveAccount(walletType);
    if (!account?.address) {
      throw new Error(`No ${walletType} wallet connected`);
    }

    // Check if we have a valid delegation for this specific wallet
    if (this.cryptoService.isDelegationValid(account.address, walletType)) {
      // Use delegated key for signing
      const messageString = new TextDecoder().decode(messageBytes);
      const signature = this.cryptoService.signRawMessage(messageString);
      
      if (signature) {
        return signature;
      }
    }
    
    // Fall back to wallet signing
    return this.signMessage(messageBytes, walletType);
  }

  /**
   * Get delegation status for the connected wallet
   */
  getDelegationStatus(walletType: 'bitcoin' | 'ethereum'): {
    hasDelegation: boolean;
    isValid: boolean;
    timeRemaining?: number;
  } {
    const account = this.getActiveAccount(walletType);
    const currentAddress = account?.address;
    
    const hasDelegation = this.cryptoService.getBrowserPublicKey() !== null;
    const isValid = this.cryptoService.isDelegationValid(currentAddress, walletType);
    const timeRemaining = this.cryptoService.getDelegationTimeRemaining();

    return {
      hasDelegation,
      isValid,
      timeRemaining: timeRemaining > 0 ? timeRemaining : undefined
    };
  }

  /**
   * Clear delegation for the connected wallet
   */
  clearDelegation(walletType: 'bitcoin' | 'ethereum'): void {
    this.cryptoService.clearDelegation();
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


}