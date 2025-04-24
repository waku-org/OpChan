export enum WalletConnectionStatus {
    Connected = 'connected',
    Disconnected = 'disconnected',
    NotDetected = 'not-detected',
    Connecting = 'connecting'
  }

export interface BtcAccount {
    address: string;
    addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
    publicKey: string;
    purpose: "payment" | "ordinals";
  }

  export interface PhantomBitcoinProvider {
    isPhantom?: boolean;
    signMessage?: (address: string, message: Uint8Array) => Promise<{ signature: Uint8Array }>;
    connect?: () => Promise<{ publicKey: string }>;
    disconnect?: () => Promise<void>;
    on?: (event: string, callback: (arg: unknown) => void) => void;
    off?: (event: string, callback: (arg: unknown) => void) => void;
    publicKey?: string;
    requestAccounts?: () => Promise<BtcAccount[]>;
  }

  export interface PhantomWallet {
    bitcoin?: PhantomBitcoinProvider;
  }

  declare global {
    interface Window {
      phantom?: PhantomWallet;
    }
  } 