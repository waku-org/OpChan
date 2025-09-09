import { OpchanMessage } from '../types/forum';
import { UnsignedMessage } from '../types/waku';
import { DelegationDuration, DelegationStatus } from './types';
import { DelegationStorage } from './storage';
export interface DelegationFullStatus extends DelegationStatus {
    publicKey?: string;
    address?: string;
    walletType?: 'bitcoin' | 'ethereum';
}
export declare class DelegationManager {
    private cachedDelegation;
    private cachedAt;
    private static readonly CACHE_TTL_MS;
    private static readonly DURATION_HOURS;
    static getDurationHours(duration: DelegationDuration): number;
    /**
     * Create a delegation with cryptographic proof
     */
    delegate(address: string, walletType: 'bitcoin' | 'ethereum', duration: DelegationDuration | undefined, signFunction: (message: string) => Promise<string>): Promise<boolean>;
    /**
     * Sign a message with delegated key
     */
    signMessage(message: UnsignedMessage): Promise<OpchanMessage | null>;
    /**
     * Verify a signed message
     */
    verify(message: OpchanMessage): Promise<boolean>;
    /**
     * Get delegation status
     */
    getStatus(currentAddress?: string, currentWalletType?: 'bitcoin' | 'ethereum'): Promise<DelegationFullStatus>;
    /**
     * Clear stored delegation
     */
    clear(): Promise<void>;
    /**
     * Create delegation proof from stored info
     */
    private createProof;
    /**
     * Verify delegation proof
     */
    private verifyProof;
}
export declare const delegationManager: DelegationManager;
export * from './types';
export { DelegationStorage };
//# sourceMappingURL=index.d.ts.map