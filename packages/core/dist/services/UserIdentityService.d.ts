import { EVerificationStatus, EDisplayPreference } from '../types/identity';
import { UserProfileUpdateMessage } from '../types/waku';
import { MessageService } from './MessageService';
export interface UserIdentity {
    address: string;
    ensName?: string;
    ordinalDetails?: {
        ordinalId: string;
        ordinalDetails: string;
    };
    callSign?: string;
    displayPreference: EDisplayPreference;
    lastUpdated: number;
    verificationStatus: EVerificationStatus;
}
export declare class UserIdentityService {
    private messageService;
    private userIdentityCache;
    private refreshListeners;
    constructor(messageService: MessageService);
    /**
     * Get user identity from cache or resolve from sources
     */
    getUserIdentity(address: string): Promise<UserIdentity | null>;
    /**
     * Get all cached user identities
     */
    getAllUserIdentities(): UserIdentity[];
    /**
     * Update user profile via Waku message
     */
    updateUserProfile(address: string, callSign: string | undefined, displayPreference: EDisplayPreference): Promise<boolean>;
    /**
     * Resolve user identity from various sources
     */
    private resolveUserIdentity;
    /**
     * Resolve ENS name from Ethereum address
     */
    private resolveENSName;
    /**
     * Resolve Ordinal details from Bitcoin address
     */
    private resolveOrdinalDetails;
    /**
     * Update user identity from Waku message
     */
    updateUserIdentityFromMessage(message: UserProfileUpdateMessage): void;
    /**
     * Map verification status string to enum
     */
    private mapVerificationStatus;
    /**
     * Refresh user identity (force re-resolution)
     */
    refreshUserIdentity(address: string): Promise<void>;
    /**
     * Clear user identity cache
     */
    clearUserIdentityCache(): void;
    /**
     * Add a refresh listener for when user identity data changes
     */
    addRefreshListener(listener: (address: string) => void): () => void;
    /**
     * Notify all listeners that user identity data has changed
     */
    private notifyRefreshListeners;
    /**
     * Get display name for user based on their preferences
     */
    getDisplayName(address: string): string;
}
//# sourceMappingURL=UserIdentityService.d.ts.map