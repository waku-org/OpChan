export type DelegationDuration = '7days' | '30days';

/**
 * Cryptographic proof that a wallet authorized a browser key
 */
export interface DelegationProof {
  authMessage: string; // "I authorize browser key: 0xabc... until 1640995200"
  walletSignature: string; // Wallet's signature of authMessage
  expiryTimestamp: number; // When this delegation expires
  walletAddress: `0x${string}`; // Ethereum address that signed the delegation
}

/**
 * Complete delegation information including private key (stored locally)
 */
export interface DelegationInfo extends DelegationProof {
  browserPublicKey: string; // Browser-generated public key
  browserPrivateKey: string; // Browser-generated private key (never shared)
  nonce: string; // Unique nonce to prevent replay attacks
}

/**
 * Status of current delegation
 */
export interface DelegationStatus {
  hasDelegation: boolean;
  isValid: boolean;
  timeRemaining?: number;
  proof?: DelegationProof; // Include proof for verification
}
