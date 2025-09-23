import { UseAppKitAccountReturn } from '@reown/appkit/react';
import { AppKit } from '@reown/appkit';
import { ordinals } from '../services/Ordinals';
import {
  getEnsName,
  verifyMessage as verifyEthereumMessage,
} from '@wagmi/core';
import { ChainNamespace } from '@reown/appkit-common';
import { config } from './config';
import { Provider } from '@reown/appkit-controllers';
import { WalletInfo, ActiveWallet } from './types';
import { Inscription } from 'ordiscan';
import { environment } from '../utils/environment';
export class WalletManager {
  private static instance: WalletManager | null = null;

  private appKit: AppKit;
  private activeAccount: UseAppKitAccountReturn;
  private activeWalletType: 'bitcoin' | 'ethereum';
  private namespace: ChainNamespace;

  private constructor(
    appKit: AppKit,
    bitcoinAccount: UseAppKitAccountReturn,
    ethereumAccount: UseAppKitAccountReturn
  ) {
    this.appKit = appKit;

    // Determine active wallet (Bitcoin takes priority)
    if (bitcoinAccount.isConnected && bitcoinAccount.address) {
      this.activeAccount = bitcoinAccount;
      this.activeWalletType = 'bitcoin';
      this.namespace = 'bip122';
    } else if (ethereumAccount.isConnected && ethereumAccount.address) {
      this.activeAccount = ethereumAccount;
      this.activeWalletType = 'ethereum';
      this.namespace = 'eip155';
    } else {
      throw new Error('No wallet is connected');
    }
  }

  /**
   * Create or get the singleton instance
   */
  static create(
    appKit: AppKit,
    bitcoinAccount: UseAppKitAccountReturn,
    ethereumAccount: UseAppKitAccountReturn
  ): WalletManager {
    // Always create a new instance to reflect current wallet state
    WalletManager.instance = new WalletManager(
      appKit,
      bitcoinAccount,
      ethereumAccount
    );
    return WalletManager.instance;
  }

  /**
   * Get the current instance (throws if not created)
   */
  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      throw new Error(
        'WalletManager not initialized. Call WalletManager.create() first.'
      );
    }
    return WalletManager.instance;
  }

  /**
   * Check if instance exists
   */
  static hasInstance(): boolean {
    return WalletManager.instance !== null;
  }

  /**
   * Clear the singleton instance
   */
  static clear(): void {
    WalletManager.instance = null;
  }

  /**
   * Resolve ENS name for an Ethereum address
   */
  static async resolveENS(address: string): Promise<string | null> {
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

  /**
   * Resolve Ordinal details for a Bitcoin address
   */
  static async resolveOperatorOrdinals(
    address: string
  ): Promise<Inscription[] | null> {
    try {
      return await ordinals.getOrdinalDetails(address);
    } catch (error) {
      console.warn('Failed to resolve Ordinal details:', error);
      return null;
    }
  }

  /**
   * Get the currently active wallet
   */
  getActiveWallet(): ActiveWallet {
    return {
      type: this.activeWalletType,
      address: this.activeAccount.address!,
      isConnected: true,
    };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.activeAccount.isConnected;
  }

  /**
   * Get the active wallet type
   */
  getWalletType(): 'bitcoin' | 'ethereum' {
    return this.activeWalletType;
  }

  /**
   * Get address of the active wallet
   */
  getAddress(): string {
    return this.activeAccount.address!;
  }

  /**
   * Sign a message using the active wallet
   */
  async signMessage(message: string): Promise<string> {
    try {
      // Access the adapter through the appKit instance
      const adapter = this.appKit.chainAdapters?.[this.namespace];

      if (!adapter) {
        throw new Error(`No adapter found for namespace: ${this.namespace}`);
      }

      // Get the provider for the current connection
      const provider = this.appKit.getProvider(this.namespace);

      if (!provider) {
        throw new Error(`No provider found for namespace: ${this.namespace}`);
      }

      if (!this.activeAccount.address) {
        throw new Error('No address found for active account');
      }

      // Call the adapter's signMessage method
      const result = await adapter.signMessage({
        message,
        address: this.activeAccount.address,
        provider: provider as Provider,
      });

      return result.signature;
    } catch (error) {
      console.error(
        `Error signing message with ${this.activeWalletType} wallet:`,
        error
      );
      throw new Error(
        `Failed to sign message with ${this.activeWalletType} wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify a message signature against a wallet address
   * @param message - The original message that was signed
   * @param signature - The signature to verify
   * @param walletAddress - The expected signer's address
   * @param walletType - The type of wallet (bitcoin/ethereum)
   * @returns Promise<boolean> - True if signature is valid
   */
  static async verifySignature(
    message: string,
    signature: string,
    walletAddress: string,
    walletType: 'bitcoin' | 'ethereum'
  ): Promise<boolean> {
    try {
      if (walletType === 'ethereum') {
        return await verifyEthereumMessage(config, {
          address: walletAddress as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        });
      } else if (walletType === 'bitcoin') {
        //TODO: implement bitcoin signature verification
        return true;
      }

      console.error(
        'WalletManager.verifySignature - unknown wallet type:',
        walletType
      );
      return false;
    } catch (error) {
      console.error(
        'WalletManager.verifySignature - error verifying signature:',
        error
      );
      return false;
    }
  }

  /**
   * Get comprehensive wallet info including ENS resolution for Ethereum
   */
  async getWalletInfo(): Promise<WalletInfo> {
    const address = this.activeAccount.address!;

    if (this.activeWalletType === 'bitcoin') {
      return {
        address,
        walletType: 'bitcoin',
        isConnected: true,
      };
    }

    // For Ethereum, try to resolve ENS name
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
}

// Convenience exports for singleton access
export const walletManager = {
  create: WalletManager.create,
  getInstance: WalletManager.getInstance,
  hasInstance: WalletManager.hasInstance,
  clear: WalletManager.clear,
  resolveENS: WalletManager.resolveENS,
  verifySignature: WalletManager.verifySignature,
};

export * from './types';
export * from './config';
