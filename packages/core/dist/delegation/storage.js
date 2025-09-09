import { localDatabase } from '../database/LocalDatabase';
export class DelegationStorage {
    /**
     * Store delegation information in IndexedDB
     */
    static async store(delegation) {
        // Reduce verbose logging in production; keep minimal signal
        if (process.env.NODE_ENV !== 'production') {
            console.log('DelegationStorage.store');
        }
        try {
            await localDatabase.storeDelegation(delegation);
        }
        catch (e) {
            console.error('Failed to store delegation information', e);
        }
    }
    /**
     * Retrieve delegation information from IndexedDB
     */
    static async retrieve() {
        try {
            const delegation = await localDatabase.loadDelegation();
            if (process.env.NODE_ENV !== 'production') {
                console.log('DelegationStorage.retrieve');
            }
            return delegation;
        }
        catch (e) {
            console.error('Failed to retrieve delegation information', e);
            return null;
        }
    }
    /**
     * Clear stored delegation information
     */
    static async clear() {
        try {
            await localDatabase.clearDelegation();
        }
        catch (e) {
            console.error('Failed to clear delegation information', e);
        }
    }
}
//# sourceMappingURL=storage.js.map