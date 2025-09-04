export type User = {
  address: string;
  walletType: 'bitcoin' | 'ethereum';

  ordinalDetails?: OrdinalDetails;
  ensDetails?: EnsDetails;

  //TODO: implement call sign & display preference setup
  callSign?: string;
  displayPreference: EDisplayPreference;

  verificationStatus: EVerificationStatus;

  signature?: string;
  lastChecked?: number;
  browserPubKey?: string; // Browser-generated public key for key delegation
  delegationSignature?: string; // Signature from Bitcoin/Ethereum wallet for delegation
  delegationExpiry?: number; // When the delegation expires
};

export enum EVerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED_BASIC = 'verified-basic',
  VERIFIED_OWNER = 'verified-owner',
  VERIFYING = 'verifying',
}

export interface OrdinalDetails {
  ordinalId: string;
  ordinalDetails: string;
}

export interface EnsDetails {
  ensName: string;
}

export enum EDisplayPreference {
  CALL_SIGN = 'call-sign',
  WALLET_ADDRESS = 'wallet-address',
}
