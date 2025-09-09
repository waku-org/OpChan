import * as ed from '@noble/ed25519';
import { bytesToHex, hexToBytes } from '../utils';
import { WalletManager } from '../wallet';
/**
 * Delegation-specific cryptographic utilities
 * Handles all cryptographic operations: key generation, signing, verification
 */
export class DelegationCrypto {
    /**
     * Create a standardized delegation authorization message
     * @param browserPublicKey - The browser public key being authorized
     * @param walletAddress - The wallet address doing the authorization
     * @param expiryTimestamp - When the delegation expires
     * @param nonce - Unique nonce for replay protection
     * @returns string - The authorization message to be signed
     */
    static createAuthMessage(browserPublicKey, walletAddress, expiryTimestamp, nonce) {
        return `I, ${walletAddress}, authorize browser key ${browserPublicKey} until ${expiryTimestamp} (nonce: ${nonce})`;
    }
    /**
     * Verify a wallet signature using WalletManager
     * @param authMessage - The message that was signed
     * @param walletSignature - The signature to verify
     * @param walletAddress - The wallet address that signed
     * @param walletType - The type of wallet
     * @returns Promise<boolean> - True if signature is valid
     */
    static async verifyWalletSignature(authMessage, walletSignature, walletAddress, walletType) {
        try {
            return await WalletManager.verifySignature(authMessage, walletSignature, walletAddress, walletType);
        }
        catch (error) {
            console.error('Error verifying wallet signature:', error);
            return false;
        }
    }
    /**
     * Generate a new browser-based keypair for signing messages
     * @returns Object with public and private keys in hex format
     */
    static generateKeypair() {
        const privateKey = ed.utils.randomSecretKey();
        const privateKeyHex = bytesToHex(privateKey);
        const publicKey = ed.getPublicKey(privateKey);
        const publicKeyHex = bytesToHex(publicKey);
        return {
            privateKey: privateKeyHex,
            publicKey: publicKeyHex,
        };
    }
    /**
     * Sign a raw string message using a private key
     * @param message - The message to sign
     * @param privateKeyHex - The private key in hex format
     * @returns The signature in hex format or null if signing fails
     */
    static signRaw(message, privateKeyHex) {
        try {
            const privateKeyBytes = hexToBytes(privateKeyHex);
            const messageBytes = new TextEncoder().encode(message);
            const signature = ed.sign(messageBytes, privateKeyBytes);
            return bytesToHex(signature);
        }
        catch (error) {
            console.error('Error signing with private key:', error);
            return null;
        }
    }
    /**
     * Verify a signature made with a public key
     * @param message - The original message
     * @param signature - The signature to verify in hex format
     * @param publicKey - The public key in hex format
     * @returns True if signature is valid
     */
    static verifyRaw(message, signature, publicKey) {
        try {
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = hexToBytes(signature);
            const publicKeyBytes = hexToBytes(publicKey);
            return ed.verify(signatureBytes, messageBytes, publicKeyBytes);
        }
        catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }
}
//# sourceMappingURL=crypto.js.map