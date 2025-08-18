/**
 * Wallet signature verification for delegation messages
 * 
 * This module handles cryptographic verification of wallet signatures
 * for Bitcoin and Ethereum wallets when they sign delegation messages.
 */

import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { recoverMessageAddress, getAddress, verifyMessage as viemVerifyMessage } from 'viem';

export class WalletSignatureVerifier {
  
  /**
   * Verify a Bitcoin wallet signature
   * @param message The original message that was signed
   * @param signature The signature in hex format
   * @param publicKey The public key in hex format
   * @returns boolean indicating if the signature is valid
   */
  static verifyBitcoinSignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    console.log(`🔐 Verifying Bitcoin signature:`, {
      messageLength: message.length,
      signatureLength: signature.length,
      publicKeyLength: publicKey.length,
      publicKeyPrefix: publicKey.slice(0, 16) + '...'
    });
    
    try {
      const messageBytes = new TextEncoder().encode(message);
      const messageHash = sha256(messageBytes);
      const signatureBytes = hexToBytes(signature);
      const publicKeyBytes = hexToBytes(publicKey);
      
      const isValid = secp256k1.verify(signatureBytes, messageHash, publicKeyBytes);
      
      console.log(`✅ Bitcoin signature verification result:`, {
        isValid,
        messageHash: bytesToHex(messageHash).slice(0, 16) + '...'
      });
      
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying Bitcoin signature:', error);
      return false;
    }
  }
  
  /**
   * Verify an Ethereum wallet signature using viem (EIP-191 personal_sign)
   * @param message The original message that was signed
   * @param signature The signature in hex format (0x...)
   * @param address The Ethereum address expected to have signed the message
   */
  static async verifyEthereumSignature(
    message: string,
    signature: string,
    address: string
  ): Promise<boolean> {
    console.log(`🔐 Verifying Ethereum signature:`, {
      messageLength: message.length,
      signatureLength: signature.length,
      expectedAddress: address,
      signaturePrefix: signature.slice(0, 16) + '...',
      fullMessage: message // Log the full message for debugging
    });
    
    try {
      // First, use viem's built-in verifier (handles prefixing correctly)
      const isValid = await viemVerifyMessage({ message, signature: signature as `0x${string}`, address: getAddress(address) as `0x${string}` });
      
      // For diagnostics only, attempt recovery
      try {
        const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
        console.log(`🔍 Ethereum signature recovery details:`, {
          recoveredAddress: recovered,
          expectedAddress: address,
          recoveredNormalized: getAddress(recovered),
          expectedNormalized: getAddress(address),
          addressesMatch: getAddress(recovered) === getAddress(address),
          rawComparison: recovered === address,
          messageBytes: new TextEncoder().encode(message).length,
          signatureBytes: signature.length
        });
      } catch (e) {
        console.warn('⚠️ Non-fatal: recoverMessageAddress failed during diagnostics:', e);
      }
      
      console.log(`✅ Ethereum signature verification result:`, { isValid });
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying Ethereum signature:', error);
      return false;
    }
  }
  
  /**
   * Verify wallet signature based on wallet type
   * @param message The original message that was signed
   * @param signature The signature in hex format
   * @param walletAddress The wallet address
   * @param walletType The type of wallet (bitcoin or ethereum)
   * @param publicKey Optional public key for Bitcoin verification
   */
  static async verifyWalletSignature(
    message: string,
    signature: string,
    walletAddress: string,
    walletType: 'bitcoin' | 'ethereum',
    publicKey?: string
  ): Promise<boolean> {
    console.log(`🔑 Starting wallet signature verification:`, {
      walletType,
      walletAddress,
      hasPublicKey: !!publicKey,
      messageLength: message.length
    });
    
    if (walletType === 'bitcoin') {
      if (!publicKey) {
        console.warn(`❌ Bitcoin verification requires public key but none provided`);
        return false;
      }
      
      console.log(`🔐 Using Bitcoin verification path`);
      return this.verifyBitcoinSignature(message, signature, publicKey);
    }
    
    // Ethereum path (no stored public key required)
    console.log(`🔐 Using Ethereum verification path`);
    return this.verifyEthereumSignature(message, signature, walletAddress);
  }
}
