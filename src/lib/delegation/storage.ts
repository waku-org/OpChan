import { LOCAL_STORAGE_KEYS } from '@/lib/waku/constants';
import { DelegationInfo } from './types';

export class DelegationStorage {
  private static readonly STORAGE_KEY = LOCAL_STORAGE_KEYS.KEY_DELEGATION;

  /**
   * Store delegation information in localStorage
   */
  static store(delegation: DelegationInfo): void {
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
      return JSON.parse(delegationJson);
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
