import { sha512 } from '@noble/hashes/sha2';
import * as ed from '@noble/ed25519';
import {  PhantomBitcoinProvider, PhantomWallet, WalletConnectionStatus } from './types';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * PhantomWalletAdapter provides methods for connecting to and interacting with
 * the Phantom wallet for Bitcoin operations.
 */
export class PhantomWalletAdapter {
  private provider: PhantomWallet | null = null;
  private btcProvider: PhantomBitcoinProvider | null = null;
  private connectionStatus: WalletConnectionStatus = WalletConnectionStatus.Disconnected;
  private currentAccount: string | null = null;

  constructor() {
    this.checkWalletAvailability();
  }


  public getStatus(): WalletConnectionStatus {
    return this.connectionStatus;
  }

  public isInstalled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window?.phantom?.bitcoin?.isPhantom);
  }

  async connect(): Promise<string> {
    this.connectionStatus = WalletConnectionStatus.Connecting;
    
    try {
      if (!window?.phantom?.bitcoin) {
        this.connectionStatus = WalletConnectionStatus.NotDetected;
        return Promise.reject(new Error('Phantom wallet not detected. Please install Phantom wallet.'));
      }

      this.provider = window.phantom;
      this.btcProvider = window.phantom.bitcoin;

      if (this.btcProvider?.connect) {
        await this.btcProvider.connect();
      }
      
      if (this.btcProvider?.requestAccounts) {
        const btcAccounts = await this.btcProvider.requestAccounts();
        
        if (!btcAccounts || btcAccounts.length === 0) {
          this.connectionStatus = WalletConnectionStatus.Disconnected;
          throw new Error('No accounts found');
        }
        
        const ordinalAccount = btcAccounts.find(acc => acc.purpose === 'ordinals');
        const account = ordinalAccount || btcAccounts[0];
        
        this.currentAccount = account.address;
        this.connectionStatus = WalletConnectionStatus.Connected;
        return account.address;
      } else {
        throw new Error('requestAccounts method not available on wallet provider');
      }
    } catch (error) {
      this.connectionStatus = window?.phantom?.bitcoin 
        ? WalletConnectionStatus.Disconnected 
        : WalletConnectionStatus.NotDetected;
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.btcProvider && this.btcProvider.disconnect) {
      try {
        await this.btcProvider.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Phantom wallet:', error);
      }
    }

    this.provider = null;
    this.btcProvider = null;
    this.currentAccount = null;
    this.connectionStatus = WalletConnectionStatus.Disconnected;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.btcProvider) {
      throw new Error('Wallet is not connected');
    }

    if (!this.currentAccount) {
      throw new Error('No active account to sign with');
    }

    try {
      if (!this.btcProvider.signMessage) {
        throw new Error('signMessage method not available on wallet provider');
      }
      
      const messageBytes = new TextEncoder().encode(message);
      
      const { signature } = await this.btcProvider.signMessage(
        this.currentAccount,
        messageBytes
      );
      
      if (signature instanceof Uint8Array) {
        const binString = String.fromCodePoint(...signature);
        return btoa(binString);
      }
      
      return String(signature);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  private checkWalletAvailability(): void {
    if (typeof window === 'undefined') {
      this.connectionStatus = WalletConnectionStatus.NotDetected;
      return;
    }

    const isPhantomInstalled = window?.phantom?.bitcoin || window?.phantom;
    
    if (!isPhantomInstalled) {
      this.connectionStatus = WalletConnectionStatus.NotDetected;
    } else {
      this.connectionStatus = WalletConnectionStatus.Disconnected;
    }
  }

}
