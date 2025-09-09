import { UseAppKitAccountReturn } from '@reown/appkit/react';
import { AppKit } from '@reown/appkit';
import { WalletInfo, ActiveWallet } from './types';
export declare class WalletManager {
    private static instance;
    private appKit;
    private activeAccount;
    private activeWalletType;
    private namespace;
    private constructor();
    /**
     * Create or get the singleton instance
     */
    static create(appKit: AppKit, bitcoinAccount: UseAppKitAccountReturn, ethereumAccount: UseAppKitAccountReturn): WalletManager;
    /**
     * Get the current instance (throws if not created)
     */
    static getInstance(): WalletManager;
    /**
     * Check if instance exists
     */
    static hasInstance(): boolean;
    /**
     * Clear the singleton instance
     */
    static clear(): void;
    /**
     * Resolve ENS name for an Ethereum address
     */
    static resolveENS(address: string): Promise<string | null>;
    /**
     * Get the currently active wallet
     */
    getActiveWallet(): ActiveWallet;
    /**
     * Check if wallet is connected
     */
    isConnected(): boolean;
    /**
     * Get the active wallet type
     */
    getWalletType(): 'bitcoin' | 'ethereum';
    /**
     * Get address of the active wallet
     */
    getAddress(): string;
    /**
     * Sign a message using the active wallet
     */
    signMessage(message: string): Promise<string>;
    /**
     * Verify a message signature against a wallet address
     * @param message - The original message that was signed
     * @param signature - The signature to verify
     * @param walletAddress - The expected signer's address
     * @param walletType - The type of wallet (bitcoin/ethereum)
     * @returns Promise<boolean> - True if signature is valid
     */
    static verifySignature(message: string, signature: string, walletAddress: string, walletType: 'bitcoin' | 'ethereum'): Promise<boolean>;
    /**
     * Get comprehensive wallet info including ENS resolution for Ethereum
     */
    getWalletInfo(): Promise<WalletInfo>;
}
export declare const walletManager: {
    create: typeof WalletManager.create;
    getInstance: typeof WalletManager.getInstance;
    hasInstance: typeof WalletManager.hasInstance;
    clear: typeof WalletManager.clear;
    resolveENS: typeof WalletManager.resolveENS;
    verifySignature: typeof WalletManager.verifySignature;
};
export * from './types';
export * from './config';
//# sourceMappingURL=index.d.ts.map