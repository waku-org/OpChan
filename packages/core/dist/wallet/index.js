import { getEnsName, verifyMessage as verifyEthereumMessage, } from '@wagmi/core';
import { config } from './config';
let bitcoinMessagePromise = null;
const loadBitcoinMessage = () => (bitcoinMessagePromise ?? (bitcoinMessagePromise = import('bitcoinjs-message')));
export class WalletManager {
    constructor(appKit, bitcoinAccount, ethereumAccount) {
        this.appKit = appKit;
        // Determine active wallet (Bitcoin takes priority)
        if (bitcoinAccount.isConnected && bitcoinAccount.address) {
            this.activeAccount = bitcoinAccount;
            this.activeWalletType = 'bitcoin';
            this.namespace = 'bip122';
        }
        else if (ethereumAccount.isConnected && ethereumAccount.address) {
            this.activeAccount = ethereumAccount;
            this.activeWalletType = 'ethereum';
            this.namespace = 'eip155';
        }
        else {
            throw new Error('No wallet is connected');
        }
    }
    /**
     * Create or get the singleton instance
     */
    static create(appKit, bitcoinAccount, ethereumAccount) {
        // Always create a new instance to reflect current wallet state
        WalletManager.instance = new WalletManager(appKit, bitcoinAccount, ethereumAccount);
        return WalletManager.instance;
    }
    /**
     * Get the current instance (throws if not created)
     */
    static getInstance() {
        if (!WalletManager.instance) {
            throw new Error('WalletManager not initialized. Call WalletManager.create() first.');
        }
        return WalletManager.instance;
    }
    /**
     * Check if instance exists
     */
    static hasInstance() {
        return WalletManager.instance !== null;
    }
    /**
     * Clear the singleton instance
     */
    static clear() {
        WalletManager.instance = null;
    }
    /**
     * Resolve ENS name for an Ethereum address
     */
    static async resolveENS(address) {
        try {
            const ensName = await getEnsName(config, {
                address: address,
            });
            return ensName || null;
        }
        catch (error) {
            console.warn('Failed to resolve ENS name:', error);
            return null;
        }
    }
    /**
     * Get the currently active wallet
     */
    getActiveWallet() {
        return {
            type: this.activeWalletType,
            address: this.activeAccount.address,
            isConnected: true,
        };
    }
    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.activeAccount.isConnected;
    }
    /**
     * Get the active wallet type
     */
    getWalletType() {
        return this.activeWalletType;
    }
    /**
     * Get address of the active wallet
     */
    getAddress() {
        return this.activeAccount.address;
    }
    /**
     * Sign a message using the active wallet
     */
    async signMessage(message) {
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
                provider: provider,
            });
            return result.signature;
        }
        catch (error) {
            console.error(`Error signing message with ${this.activeWalletType} wallet:`, error);
            throw new Error(`Failed to sign message with ${this.activeWalletType} wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    static async verifySignature(message, signature, walletAddress, walletType) {
        try {
            if (process.env.NODE_ENV === 'development') {
                // Keep this lightweight in dev; avoid logging full message/signature repeatedly
                console.debug('WalletManager.verifySignature', { walletType });
            }
            if (walletType === 'ethereum') {
                return await verifyEthereumMessage(config, {
                    address: walletAddress,
                    message,
                    signature: signature,
                });
            }
            else if (walletType === 'bitcoin') {
                if (process.env.NODE_ENV === 'development') {
                    console.debug('WalletManager.verifySignature (bitcoin)');
                }
                const bitcoinMessage = await loadBitcoinMessage();
                const result = bitcoinMessage.verify(message, walletAddress, signature);
                if (process.env.NODE_ENV === 'development') {
                    console.debug('WalletManager.verifySignature (bitcoin) result', result);
                }
                return result;
            }
            console.error('WalletManager.verifySignature - unknown wallet type:', walletType);
            return false;
        }
        catch (error) {
            console.error('WalletManager.verifySignature - error verifying signature:', error);
            return false;
        }
    }
    /**
     * Get comprehensive wallet info including ENS resolution for Ethereum
     */
    async getWalletInfo() {
        const address = this.activeAccount.address;
        if (this.activeWalletType === 'bitcoin') {
            return {
                address,
                walletType: 'bitcoin',
                isConnected: true,
            };
        }
        // For Ethereum, try to resolve ENS name
        let ensName;
        try {
            const resolvedName = await getEnsName(config, {
                address: address,
            });
            ensName = resolvedName || undefined;
        }
        catch (error) {
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
WalletManager.instance = null;
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
//# sourceMappingURL=index.js.map