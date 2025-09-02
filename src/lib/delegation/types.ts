export type DelegationDuration = '7days' | '30days';

export interface DelegationSignature {
  signature: string; // Signature from wallet
  expiryTimestamp: number; // When this delegation expires
  browserPublicKey: string; // Browser-generated public key that was delegated to
  walletAddress: string; // Wallet address that signed the delegation
  walletType: 'bitcoin' | 'ethereum'; // Type of wallet that created the delegation
}

export interface DelegationInfo extends DelegationSignature {
  browserPrivateKey: string;
}

export interface DelegationStatus {
  hasDelegation: boolean;
  isValid: boolean;
  timeRemaining?: number;
}
