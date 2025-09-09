import { DelegationInfo } from './types';
export declare class DelegationStorage {
    /**
     * Store delegation information in IndexedDB
     */
    static store(delegation: DelegationInfo): Promise<void>;
    /**
     * Retrieve delegation information from IndexedDB
     */
    static retrieve(): Promise<DelegationInfo | null>;
    /**
     * Clear stored delegation information
     */
    static clear(): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map