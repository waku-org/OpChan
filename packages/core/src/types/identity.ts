export type User = {
  address: string; // Can be `0x${string}` for wallet users or UUID for anonymous users

  ensName?: string;
  ensAvatar?: string;

  callSign?: string;
  displayPreference: EDisplayPreference;
  displayName: string;

  verificationStatus: EVerificationStatus;

  signature?: string;
  lastChecked?: number;
  browserPubKey?: string; // Browser-generated public key for key delegation
  delegationSignature?: string; // Signature from Ethereum wallet for delegation
  delegationExpiry?: number; // When the delegation expires
};

export enum EVerificationStatus {
  ANONYMOUS = 'anonymous',
  WALLET_UNCONNECTED = 'wallet-unconnected',
  WALLET_CONNECTED = 'wallet-connected',
  ENS_VERIFIED = 'ens-verified',
}

export enum EDisplayPreference {
  CALL_SIGN = 'call-sign',
  WALLET_ADDRESS = 'wallet-address',
}
