import { UseAppKitAccountReturn } from '@reown/appkit/react';
import { AppKit } from '@reown/appkit';
import { getEnsName } from '@wagmi/core';
import { ChainNamespace } from '@reown/appkit-common';
import { config } from './config';
import { Provider } from '@reown/appkit-controllers';
import { WalletInfo, ActiveWallet } from './types';

export class WalletManager {
  private appKit?: AppKit;
  private bitcoinAccount?: UseAppKitAccountReturn;
  private ethereumAccount?: UseAppKitAccountReturn;

  /**
   * Set the AppKit instance for accessing adapters
   */
  setAppKit(appKit: AppKit): void {
    this.appKit = appKit;
  }

  /**
   * Set account references from AppKit hooks
   */
  setAccounts(
    bitcoinAccount: UseAppKitAccountReturn,
    ethereumAccount: UseAppKitAccountReturn
  ): void {
    this.bitcoinAccount = bitcoinAccount;
    this.ethereumAccount = ethereumAccount;
  }

  /**
   * Get the currently active wallet (Bitcoin takes priority)
   */
  getActiveWallet(): ActiveWallet | null {
    if (this.bitcoinAccount?.isConnected && this.bitcoinAccount.address) {
      return {
        type: 'bitcoin',
        address: this.bitcoinAccount.address,
        isConnected: true,
      };
    }

    if (this.ethereumAccount?.isConnected && this.ethereumAccount.address) {
      return {
        type: 'ethereum',
        address: this.ethereumAccount.address,
        isConnected: true,
      };
    }

    return null;
  }

  /**
   * Check if any wallet is connected
   */
  isConnected(): boolean {
    return (
      (this.bitcoinAccount?.isConnected ?? false) ||
      (this.ethereumAccount?.isConnected ?? false)
    );
  }

  /**
   * Check if a specific wallet type is connected
   */
  isWalletConnected(walletType: 'bitcoin' | 'ethereum'): boolean {
    const account =
      walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
    return account?.isConnected ?? false;
  }

  /**
   * Get address for a specific wallet type
   */
  getAddress(walletType: 'bitcoin' | 'ethereum'): string | undefined {
    const account =
      walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
    return account?.address;
  }

  /**
   * Get the appropriate namespace for the wallet type
   */
  private getNamespace(walletType: 'bitcoin' | 'ethereum'): ChainNamespace {
    return walletType === 'bitcoin' ? 'bip122' : 'eip155';
  }

  /**
   * Sign a message using the appropriate wallet adapter
   */
  async signMessage(
    message: string,
    walletType: 'bitcoin' | 'ethereum'
  ): Promise<string> {
    if (!this.appKit) {
      throw new Error('AppKit instance not set. Call setAppKit() first.');
    }

    const account =
      walletType === 'bitcoin' ? this.bitcoinAccount : this.ethereumAccount;
    if (!account?.address) {
      throw new Error(`No ${walletType} wallet connected`);
    }

    const namespace = this.getNamespace(walletType);

    try {
      // Access the adapter through the appKit instance
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
        message,
        address: account.address,
        provider: provider as Provider,
      });

      return result.signature;
    } catch (error) {
      console.error(`Error signing message with ${walletType} wallet:`, error);
      throw new Error(
        `Failed to sign message with ${walletType} wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get comprehensive wallet info including ENS resolution for Ethereum
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    if (this.bitcoinAccount?.isConnected) {
      return {
        address: this.bitcoinAccount.address as string,
        walletType: 'bitcoin',
        isConnected: true,
      };
    }

    if (this.ethereumAccount?.isConnected) {
      const address = this.ethereumAccount.address as string;

      // Try to resolve ENS name
      let ensName: string | undefined;
      try {
        const resolvedName = await getEnsName(config, {
          address: address as `0x${string}`,
        });
        ensName = resolvedName || undefined;
      } catch (error) {
        console.warn('Failed to resolve ENS name:', error);
      }

      return {
        address,
        walletType: 'ethereum',
        ensName,
        isConnected: true,
      };
    }

    return null;
  }

  /**
   * Resolve ENS name for an Ethereum address
   */
  async resolveENS(address: string): Promise<string | null> {
    try {
      const ensName = await getEnsName(config, {
        address: address as `0x${string}`,
      });
      return ensName || null;
    } catch (error) {
      console.warn('Failed to resolve ENS name:', error);
      return null;
    }
  }
}

// Export singleton instance
export const walletManager = new WalletManager();
export * from './types';
export * from './config';
