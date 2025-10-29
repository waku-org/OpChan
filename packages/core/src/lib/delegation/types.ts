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
 * Anonymous delegation information (browser-only, no wallet proof)
 */
export interface AnonymousDelegationInfo {
  sessionId: string; // UUID session identifier
  browserPublicKey: string; // Browser-generated public key
  browserPrivateKey: string; // Browser-generated private key (never shared)
  expiryTimestamp: number; // When this delegation expires
  nonce: string; // Unique nonce to prevent replay attacks
}

/**
 * Wallet delegation information (includes wallet proof)
 */
export interface WalletDelegationInfo extends DelegationProof {
  browserPublicKey: string; // Browser-generated public key
  browserPrivateKey: string; // Browser-generated private key (never shared)
  nonce: string; // Unique nonce to prevent replay attacks
}

/**
 * Complete delegation information - can be wallet-based or anonymous
 */
export type DelegationInfo = WalletDelegationInfo | AnonymousDelegationInfo;

/**
 * Status of current delegation
 */
export interface DelegationStatus {
  hasDelegation: boolean;
  isValid: boolean;
  timeRemaining?: number;
  proof?: DelegationProof; // Include proof for verification
}
