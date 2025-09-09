export type DelegationDuration = '7days' | '30days';
/**
 * Cryptographic proof that a wallet authorized a browser key
 */
export interface DelegationProof {
    authMessage: string;
    walletSignature: string;
    expiryTimestamp: number;
    walletAddress: string;
    walletType: 'bitcoin' | 'ethereum';
}
/**
 * Complete delegation information including private key (stored locally)
 */
export interface DelegationInfo extends DelegationProof {
    browserPublicKey: string;
    browserPrivateKey: string;
    nonce: string;
}
/**
 * Status of current delegation
 */
export interface DelegationStatus {
    hasDelegation: boolean;
    isValid: boolean;
    timeRemaining?: number;
    proof?: DelegationProof;
}
//# sourceMappingURL=types.d.ts.map