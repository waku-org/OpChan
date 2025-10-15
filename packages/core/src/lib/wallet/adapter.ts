export interface WalletAdapter {
  getAddress(): string | null;
  getWalletType(): 'bitcoin' | 'ethereum' | null;
  isConnected(): boolean;
  signMessage(message: string): Promise<string>;
}

let currentAdapter: WalletAdapter | null = null;

export function setWalletAdapter(adapter: WalletAdapter | null): void {
  currentAdapter = adapter;
}

export function getWalletAdapter(): WalletAdapter | null {
  return currentAdapter;
}



