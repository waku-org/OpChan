import { LOCAL_STORAGE_KEYS } from '@/lib/waku/constants';
import { DelegationInfo } from './types';

export class DelegationStorage {
  private static readonly STORAGE_KEY = LOCAL_STORAGE_KEYS.KEY_DELEGATION;

  /**
   * Store delegation information in localStorage
   */
  static store(delegation: DelegationInfo): void {
    console.log('DelegationStorage.store - storing delegation:', {
      hasAuthMessage: !!delegation.authMessage,
      hasWalletSignature: !!delegation.walletSignature,
      hasExpiryTimestamp: delegation.expiryTimestamp !== undefined,
      hasWalletAddress: !!delegation.walletAddress,
      hasWalletType: !!delegation.walletType,
      hasBrowserPublicKey: !!delegation.browserPublicKey,
      hasBrowserPrivateKey: !!delegation.browserPrivateKey,
      hasNonce: !!delegation.nonce,
      authMessage: delegation.authMessage,
      walletSignature: delegation.walletSignature,
      expiryTimestamp: delegation.expiryTimestamp,
      walletAddress: delegation.walletAddress,
      walletType: delegation.walletType,
      browserPublicKey: delegation.browserPublicKey,
      nonce: delegation.nonce,
    });

    localStorage.setItem(
      DelegationStorage.STORAGE_KEY,
      JSON.stringify(delegation)
    );
  }

  /**
   * Retrieve delegation information from localStorage
   */
  static retrieve(): DelegationInfo | null {
    const delegationJson = localStorage.getItem(DelegationStorage.STORAGE_KEY);
    if (!delegationJson) return null;

    try {
      const delegation = JSON.parse(delegationJson);
      console.log('DelegationStorage.retrieve - retrieved delegation:', {
        hasAuthMessage: !!delegation.authMessage,
        hasWalletSignature: !!delegation.walletSignature,
        hasExpiryTimestamp: delegation.expiryTimestamp !== undefined,
        hasWalletAddress: !!delegation.walletAddress,
        hasWalletType: !!delegation.walletType,
        hasBrowserPublicKey: !!delegation.browserPublicKey,
        hasBrowserPrivateKey: !!delegation.browserPrivateKey,
        hasNonce: !!delegation.nonce,
        authMessage: delegation.authMessage,
        walletSignature: delegation.walletSignature,
        expiryTimestamp: delegation.expiryTimestamp,
        walletAddress: delegation.walletAddress,
        walletType: delegation.walletType,
        browserPublicKey: delegation.browserPublicKey,
        nonce: delegation.nonce,
      });
      return delegation;
    } catch (e) {
      console.error('Failed to parse delegation information', e);
      return null;
    }
  }

  /**
   * Clear stored delegation information
   */
  static clear(): void {
    localStorage.removeItem(DelegationStorage.STORAGE_KEY);
  }
}
