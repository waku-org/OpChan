import { localDatabase } from '../database/LocalDatabase';
import { DelegationInfo } from './types';

export class DelegationStorage {
  /**
   * Store delegation information in IndexedDB
   */
  static async store(delegation: DelegationInfo): Promise<void> {
    // Reduce verbose logging in production; keep minimal signal
    if (process.env.NODE_ENV !== 'production') {
      console.log('DelegationStorage.store');
    }

    try {
      await localDatabase.storeDelegation(delegation);
    } catch (e) {
      console.error('Failed to store delegation information', e);
    }
  }

  /**
   * Retrieve delegation information from IndexedDB
   */
  static async retrieve(): Promise<DelegationInfo | null> {
    try {
      const delegation = await localDatabase.loadDelegation();
      if (process.env.NODE_ENV !== 'production') {
        console.log('DelegationStorage.retrieve');
      }
      return delegation;
    } catch (e) {
      console.error('Failed to retrieve delegation information', e);
      return null;
    }
  }

  /**
   * Clear stored delegation information
   */
  static async clear(): Promise<void> {
    try {
      await localDatabase.clearDelegation();
    } catch (e) {
      console.error('Failed to clear delegation information', e);
    }
  }
}
