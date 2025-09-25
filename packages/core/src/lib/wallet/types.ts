export interface WalletInfo {
  address: string;
  walletType: 'bitcoin' | 'ethereum';
  ensName?: string;
  isConnected: boolean;
}

export interface ActiveWallet {
  type: 'bitcoin' | 'ethereum';
  address: string;
  isConnected: boolean;
}
