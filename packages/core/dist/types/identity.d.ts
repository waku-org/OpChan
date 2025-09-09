export type User = {
    address: string;
    walletType: 'bitcoin' | 'ethereum';
    ordinalDetails?: OrdinalDetails;
    ensDetails?: EnsDetails;
    callSign?: string;
    displayPreference: EDisplayPreference;
    verificationStatus: EVerificationStatus;
    signature?: string;
    lastChecked?: number;
    browserPubKey?: string;
    delegationSignature?: string;
    delegationExpiry?: number;
};
export declare enum EVerificationStatus {
    WALLET_UNCONNECTED = "wallet-unconnected",
    WALLET_CONNECTED = "wallet-connected",
    ENS_ORDINAL_VERIFIED = "ens-ordinal-verified"
}
export interface OrdinalDetails {
    ordinalId: string;
    ordinalDetails: string;
}
export interface EnsDetails {
    ensName: string;
}
export declare enum EDisplayPreference {
    CALL_SIGN = "call-sign",
    WALLET_ADDRESS = "wallet-address"
}
//# sourceMappingURL=identity.d.ts.map