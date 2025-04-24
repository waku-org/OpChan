export interface DelegationSignature {
  signature: string;      // Signature from Bitcoin wallet
  expiryTimestamp: number; // When this delegation expires
  browserPublicKey: string; // Browser-generated public key that was delegated to
  bitcoinAddress: string;   // Bitcoin address that signed the delegation
}

export interface DelegationInfo extends DelegationSignature {
  browserPrivateKey: string;
}