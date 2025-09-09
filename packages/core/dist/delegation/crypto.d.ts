/**
 * Delegation-specific cryptographic utilities
 * Handles all cryptographic operations: key generation, signing, verification
 */
export declare class DelegationCrypto {
    /**
     * Create a standardized delegation authorization message
     * @param browserPublicKey - The browser public key being authorized
     * @param walletAddress - The wallet address doing the authorization
     * @param expiryTimestamp - When the delegation expires
     * @param nonce - Unique nonce for replay protection
     * @returns string - The authorization message to be signed
     */
    static createAuthMessage(browserPublicKey: string, walletAddress: string, expiryTimestamp: number, nonce: string): string;
    /**
     * Verify a wallet signature using WalletManager
     * @param authMessage - The message that was signed
     * @param walletSignature - The signature to verify
     * @param walletAddress - The wallet address that signed
     * @param walletType - The type of wallet
     * @returns Promise<boolean> - True if signature is valid
     */
    static verifyWalletSignature(authMessage: string, walletSignature: string, walletAddress: string, walletType: 'bitcoin' | 'ethereum'): Promise<boolean>;
    /**
     * Generate a new browser-based keypair for signing messages
     * @returns Object with public and private keys in hex format
     */
    static generateKeypair(): {
        publicKey: string;
        privateKey: string;
    };
    /**
     * Sign a raw string message using a private key
     * @param message - The message to sign
     * @param privateKeyHex - The private key in hex format
     * @returns The signature in hex format or null if signing fails
     */
    static signRaw(message: string, privateKeyHex: string): string | null;
    /**
     * Verify a signature made with a public key
     * @param message - The original message
     * @param signature - The signature to verify in hex format
     * @param publicKey - The public key in hex format
     * @returns True if signature is valid
     */
    static verifyRaw(message: string, signature: string, publicKey: string): boolean;
}
//# sourceMappingURL=crypto.d.ts.map