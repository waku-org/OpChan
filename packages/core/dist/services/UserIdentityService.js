import { EVerificationStatus, EDisplayPreference } from '../types/identity';
import { MessageType, } from '../types/waku';
import messageManager from '../waku';
import { localDatabase } from '../database/LocalDatabase';
export class UserIdentityService {
    constructor(messageService) {
        this.userIdentityCache = {};
        this.refreshListeners = new Set();
        this.messageService = messageService;
    }
    /**
     * Get user identity from cache or resolve from sources
     */
    async getUserIdentity(address) {
        // Check internal cache first
        if (this.userIdentityCache[address]) {
            const cached = this.userIdentityCache[address];
            if (process.env.NODE_ENV === 'development') {
                console.debug('UserIdentityService: cache hit (internal)');
            }
            // Enrich with ENS name if missing and ETH address
            if (!cached.ensName && address.startsWith('0x')) {
                const ensName = await this.resolveENSName(address);
                if (ensName) {
                    cached.ensName = ensName;
                }
            }
            return {
                address,
                ensName: cached.ensName,
                ordinalDetails: cached.ordinalDetails,
                callSign: cached.callSign,
                displayPreference: cached.displayPreference,
                lastUpdated: cached.lastUpdated,
                verificationStatus: this.mapVerificationStatus(cached.verificationStatus),
            };
        }
        // Check LocalDatabase first for persisted identities (warm start)
        const persisted = localDatabase.cache.userIdentities[address];
        if (persisted) {
            this.userIdentityCache[address] = {
                ensName: persisted.ensName,
                ordinalDetails: persisted.ordinalDetails,
                callSign: persisted.callSign,
                displayPreference: persisted.displayPreference,
                lastUpdated: persisted.lastUpdated,
                verificationStatus: persisted.verificationStatus,
            };
            const result = {
                address,
                ensName: persisted.ensName,
                ordinalDetails: persisted.ordinalDetails,
                callSign: persisted.callSign,
                displayPreference: persisted.displayPreference,
                lastUpdated: persisted.lastUpdated,
                verificationStatus: this.mapVerificationStatus(persisted.verificationStatus),
            };
            // Enrich with ENS name if missing and ETH address
            if (!result.ensName && address.startsWith('0x')) {
                const ensName = await this.resolveENSName(address);
                if (ensName) {
                    result.ensName = ensName;
                    this.userIdentityCache[address].ensName = ensName;
                }
            }
            return result;
        }
        // Fallback: Check Waku message cache
        const cacheServiceData = messageManager.messageCache.userIdentities[address];
        if (cacheServiceData) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('UserIdentityService: cache hit (message cache)');
            }
            // Store in internal cache for future use
            this.userIdentityCache[address] = {
                ensName: cacheServiceData.ensName,
                ordinalDetails: cacheServiceData.ordinalDetails,
                callSign: cacheServiceData.callSign,
                displayPreference: cacheServiceData.displayPreference,
                lastUpdated: cacheServiceData.lastUpdated,
                verificationStatus: cacheServiceData.verificationStatus,
            };
            const result = {
                address,
                ensName: cacheServiceData.ensName,
                ordinalDetails: cacheServiceData.ordinalDetails,
                callSign: cacheServiceData.callSign,
                displayPreference: cacheServiceData.displayPreference,
                lastUpdated: cacheServiceData.lastUpdated,
                verificationStatus: this.mapVerificationStatus(cacheServiceData.verificationStatus),
            };
            // Enrich with ENS name if missing and ETH address
            if (!result.ensName && address.startsWith('0x')) {
                const ensName = await this.resolveENSName(address);
                if (ensName) {
                    result.ensName = ensName;
                    this.userIdentityCache[address].ensName = ensName;
                }
            }
            return result;
        }
        if (process.env.NODE_ENV === 'development') {
            console.debug('UserIdentityService: cache miss, resolving');
        }
        // Try to resolve identity from various sources
        const identity = await this.resolveUserIdentity(address);
        if (identity) {
            this.userIdentityCache[address] = {
                ensName: identity.ensName,
                ordinalDetails: identity.ordinalDetails,
                callSign: identity.callSign,
                displayPreference: identity.displayPreference,
                lastUpdated: identity.lastUpdated,
                verificationStatus: identity.verificationStatus,
            };
        }
        return identity;
    }
    /**
     * Get all cached user identities
     */
    getAllUserIdentities() {
        return Object.entries(this.userIdentityCache).map(([address, cached]) => ({
            address,
            ensName: cached.ensName,
            ordinalDetails: cached.ordinalDetails,
            callSign: cached.callSign,
            displayPreference: cached.displayPreference,
            lastUpdated: cached.lastUpdated,
            verificationStatus: this.mapVerificationStatus(cached.verificationStatus),
        }));
    }
    /**
     * Update user profile via Waku message
     */
    async updateUserProfile(address, callSign, displayPreference) {
        try {
            if (process.env.NODE_ENV === 'development') {
                console.debug('UserIdentityService: updating profile', { address });
            }
            const timestamp = Date.now();
            const unsignedMessage = {
                id: crypto.randomUUID(),
                type: MessageType.USER_PROFILE_UPDATE,
                timestamp,
                author: address,
                displayPreference,
            };
            // Only include callSign if provided and non-empty
            if (callSign && callSign.trim()) {
                unsignedMessage.callSign = callSign.trim();
            }
            if (process.env.NODE_ENV === 'development') {
                console.debug('UserIdentityService: created unsigned message');
            }
            const signedMessage = await this.messageService.signAndBroadcastMessage(unsignedMessage);
            if (process.env.NODE_ENV === 'development') {
                console.debug('UserIdentityService: message broadcast result', !!signedMessage);
            }
            // If broadcast was successful, immediately update local cache
            if (signedMessage) {
                this.updateUserIdentityFromMessage(signedMessage);
                // Also update the local database cache immediately
                if (this.userIdentityCache[address]) {
                    const updatedIdentity = {
                        ...this.userIdentityCache[address],
                        callSign: callSign && callSign.trim()
                            ? callSign.trim()
                            : this.userIdentityCache[address].callSign,
                        displayPreference,
                        lastUpdated: timestamp,
                    };
                    localDatabase.cache.userIdentities[address] = updatedIdentity;
                    // Persist to IndexedDB using the storeMessage method
                    const profileMessage = {
                        id: unsignedMessage.id,
                        type: MessageType.USER_PROFILE_UPDATE,
                        timestamp,
                        author: address,
                        displayPreference,
                        signature: signedMessage.signature,
                        browserPubKey: signedMessage.browserPubKey,
                        delegationProof: signedMessage.delegationProof,
                    };
                    if (callSign && callSign.trim()) {
                        profileMessage.callSign = callSign.trim();
                    }
                    // Apply the message to update the database
                    await localDatabase.applyMessage(profileMessage);
                    // Notify listeners that the user identity has been updated
                    this.notifyRefreshListeners(address);
                }
            }
            return !!signedMessage;
        }
        catch (error) {
            console.error('Failed to update user profile:', error);
            return false;
        }
    }
    /**
     * Resolve user identity from various sources
     */
    async resolveUserIdentity(address) {
        try {
            const [ensName, ordinalDetails] = await Promise.all([
                this.resolveENSName(address),
                this.resolveOrdinalDetails(address),
            ]);
            // Default to wallet address display preference
            const defaultDisplayPreference = EDisplayPreference.WALLET_ADDRESS;
            // Default verification status based on what we can resolve
            let verificationStatus = EVerificationStatus.WALLET_UNCONNECTED;
            if (ensName || ordinalDetails) {
                verificationStatus = EVerificationStatus.ENS_ORDINAL_VERIFIED;
            }
            return {
                address,
                ensName: ensName || undefined,
                ordinalDetails: ordinalDetails || undefined,
                callSign: undefined, // Will be populated from Waku messages
                displayPreference: defaultDisplayPreference,
                lastUpdated: Date.now(),
                verificationStatus,
            };
        }
        catch (error) {
            console.error('Failed to resolve user identity:', error);
            return null;
        }
    }
    /**
     * Resolve ENS name from Ethereum address
     */
    async resolveENSName(address) {
        if (!address.startsWith('0x')) {
            return null; // Not an Ethereum address
        }
        try {
            // Import the ENS resolver from wagmi
            const { getEnsName } = await import('@wagmi/core');
            const { config } = await import('../wallet/config');
            const ensName = await getEnsName(config, {
                address: address,
            });
            return ensName || null;
        }
        catch (error) {
            console.error('Failed to resolve ENS name:', error);
            return null;
        }
    }
    /**
     * Resolve Ordinal details from Bitcoin address
     */
    async resolveOrdinalDetails(address) {
        try {
            //TODO: add Ordinal API call
            console.log('resolveOrdinalDetails', address);
            return null;
        }
        catch (error) {
            console.error('Failed to resolve Ordinal details:', error);
            return null;
        }
    }
    /**
     * Update user identity from Waku message
     */
    updateUserIdentityFromMessage(message) {
        const { author, callSign, displayPreference, timestamp } = message;
        if (!this.userIdentityCache[author]) {
            // Create new identity entry if it doesn't exist
            this.userIdentityCache[author] = {
                ensName: undefined,
                ordinalDetails: undefined,
                callSign: undefined,
                displayPreference,
                lastUpdated: timestamp,
                verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
            };
        }
        // Update only if this message is newer
        if (timestamp > this.userIdentityCache[author].lastUpdated) {
            this.userIdentityCache[author] = {
                ...this.userIdentityCache[author],
                callSign,
                displayPreference,
                lastUpdated: timestamp,
            };
            // Notify listeners that the user identity has been updated
            this.notifyRefreshListeners(author);
        }
    }
    /**
     * Map verification status string to enum
     */
    mapVerificationStatus(status) {
        switch (status) {
            case 'verified-basic':
                return EVerificationStatus.WALLET_CONNECTED;
            case 'verified-owner':
                return EVerificationStatus.ENS_ORDINAL_VERIFIED;
            case 'verifying':
                return EVerificationStatus.WALLET_CONNECTED; // Temporary state during verification
            default:
                return EVerificationStatus.WALLET_UNCONNECTED;
        }
    }
    /**
     * Refresh user identity (force re-resolution)
     */
    async refreshUserIdentity(address) {
        delete this.userIdentityCache[address];
        await this.getUserIdentity(address);
    }
    /**
     * Clear user identity cache
     */
    clearUserIdentityCache() {
        this.userIdentityCache = {};
    }
    /**
     * Add a refresh listener for when user identity data changes
     */
    addRefreshListener(listener) {
        this.refreshListeners.add(listener);
        return () => this.refreshListeners.delete(listener);
    }
    /**
     * Notify all listeners that user identity data has changed
     */
    notifyRefreshListeners(address) {
        this.refreshListeners.forEach((listener) => listener(address));
    }
    /**
     * Get display name for user based on their preferences
     */
    getDisplayName(address) {
        const identity = this.userIdentityCache[address];
        if (!identity) {
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
        if (identity.displayPreference === EDisplayPreference.CALL_SIGN &&
            identity.callSign) {
            return identity.callSign;
        }
        if (identity.ensName) {
            return identity.ensName;
        }
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}
//# sourceMappingURL=UserIdentityService.js.map