import { EVerificationStatus, EDisplayPreference, IdentityProvider, Claim } from '@/types/identity';
import {
  UnsignedUserProfileUpdateMessage,
  UserProfileUpdateMessage,
  MessageType,
  UserIdentityCache,
} from '@/types/waku';
import { MessageService } from './MessageService';
import messageManager from '@/lib/waku';
import { localDatabase } from '@/lib/database/LocalDatabase';
import { WalletManager } from '@/lib/wallet';
import { getVerification } from '../zkPassport';

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
  identityProviders?: IdentityProvider[];
}

export class UserIdentityService {
  private messageService: MessageService;
  private userIdentityCache: UserIdentityCache = {};
  private refreshListeners: Set<(address: string) => void> = new Set();

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  /**
   * Get user identity from cache or resolve from sources
   */
  async getUserIdentity(address: string): Promise<UserIdentity | null> {
    // Check internal cache first
    if (this.userIdentityCache[address]) {
      const cached = this.userIdentityCache[address];
      if (import.meta.env?.DEV) {
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
        verificationStatus: this.mapVerificationStatus(
          cached.verificationStatus
        ),
        identityProviders: cached.identityProviders
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
        verificationStatus: this.mapVerificationStatus(
          persisted.verificationStatus
        ),
      } as UserIdentity;
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
    const cacheServiceData =
      messageManager.messageCache.userIdentities[address];

    if (cacheServiceData) {
      if (import.meta.env?.DEV) {
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
        verificationStatus: this.mapVerificationStatus(
          cacheServiceData.verificationStatus
        ),
      } as UserIdentity;
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

    if (import.meta.env?.DEV) {
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
   * Force a fresh identity resolution bypassing caches and LocalDatabase.
   * Useful for explicit verification flows where we must hit upstream resolvers.
   */
  async getUserIdentityFresh(address: string): Promise<UserIdentity | null> {
    if (import.meta.env?.DEV) {
      console.debug('UserIdentityService: fresh resolve requested');
    }
    const identity = await this.resolveUserIdentity(address);
    if (identity) {
      // Update in-memory cache to reflect the fresh result
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
  getAllUserIdentities(): UserIdentity[] {
    return Object.entries(this.userIdentityCache).map(([address, cached]) => ({
      address,
      ensName: cached.ensName,
      ordinalDetails: cached.ordinalDetails,
      callSign: cached.callSign,
      displayPreference: cached.displayPreference,
      lastUpdated: cached.lastUpdated,
      verificationStatus: this.mapVerificationStatus(cached.verificationStatus),
      identityProviders: cached.identityProviders
    }));
  }

  /**
   * Update user profile via Waku message
   */
  async updateUserProfile(
    address: string,
    callSign: string | undefined,
    displayPreference: EDisplayPreference
  ): Promise<boolean> {
    try {
      if (import.meta.env?.DEV) {
        console.debug('UserIdentityService: updating profile', { address });
      }

      const timestamp = Date.now();
      const unsignedMessage: UnsignedUserProfileUpdateMessage = {
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

      if (import.meta.env?.DEV) {
        console.debug('UserIdentityService: created unsigned message');
      }

      const signedMessage =
        await this.messageService.signAndBroadcastMessage(unsignedMessage);

      if (import.meta.env?.DEV) {
        console.debug(
          'UserIdentityService: message broadcast result',
          !!signedMessage
        );
      }

      // If broadcast was successful, immediately update local cache
      if (signedMessage) {
        this.updateUserIdentityFromMessage(
          signedMessage as UserProfileUpdateMessage
        );

        // Also update the local database cache immediately
        if (this.userIdentityCache[address]) {
          const updatedIdentity = {
            ...this.userIdentityCache[address],
            callSign:
              callSign && callSign.trim()
                ? callSign.trim()
                : this.userIdentityCache[address].callSign,
            displayPreference,
            lastUpdated: timestamp,
            identityProviders: this.userIdentityCache[address].identityProviders
          };

          localDatabase.cache.userIdentities[address] = updatedIdentity;

          // Persist to IndexedDB using the storeMessage method
          const profileMessage: UserProfileUpdateMessage = {
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
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return false;
    }
  }

  /**
   * Resolve user identity from various sources
   */
  private async resolveUserIdentity(
    address: string
  ): Promise<UserIdentity | null> {
    try {
      const [ensName, ordinalDetails] = await Promise.all([
        this.resolveENSName(address),
        this.resolveOrdinalDetails(address),
      ]);

      // Default to wallet address display preference
      const defaultDisplayPreference: EDisplayPreference =
        EDisplayPreference.WALLET_ADDRESS;

      // Default verification status based on what we can resolve
      let verificationStatus: EVerificationStatus =
        EVerificationStatus.WALLET_UNCONNECTED;
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
        identityProviders: []
      };
    } catch (error) {
      console.error('Failed to resolve user identity:', error);
      return null;
    }
  }

  /**
   * Resolve ENS name from Ethereum address
   */
  private async resolveENSName(address: string): Promise<string | null> {
    if (!address.startsWith('0x')) {
      return null; // Not an Ethereum address
    }

    try {
      // Import the ENS resolver from wagmi
      const { getEnsName } = await import('@wagmi/core');
      const { config } = await import('@/lib/wallet/config');

      const ensName = await getEnsName(config, {
        address: address as `0x${string}`,
      });

      return ensName || null;
    } catch (error) {
      console.error('Failed to resolve ENS name:', error);
      return null;
    }
  }

  /**
   * Resolve Ordinal details from Bitcoin address
   */
  private async resolveOrdinalDetails(
    address: string
  ): Promise<{ ordinalId: string; ordinalDetails: string } | null> {
    try {
      if (address.startsWith('0x')) {
        return null;
      }

      const inscriptions = await WalletManager.resolveOperatorOrdinals(address);
      if (Array.isArray(inscriptions) && inscriptions.length > 0) {
        const first = inscriptions[0]!;
        return {
          ordinalId: first.inscription_id,
          ordinalDetails:
            first.parent_inscription_id || 'Operator badge present',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to resolve Ordinal details:', error);
      return null;
    }
  }

  /**
   * Update user identity from Waku message
   */
  updateUserIdentityFromMessage(message: UserProfileUpdateMessage): void {
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
        identityProviders: []
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
   * Update user identity with ZKPassport adulthood verification
   */
  updateUserIdentityWithAdulthood(
    address: string,
    uniqueIdentifier: string,
    isAdult: boolean
  ): void {
    const timestamp = Date.now();
    
    if (!this.userIdentityCache[address]) {
      // Create new identity entry if it doesn't exist
      this.userIdentityCache[address] = {
        ensName: undefined,
        ordinalDetails: undefined,
        callSign: undefined,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
        verificationStatus: EVerificationStatus.WALLET_CONNECTED,
      };
    }

    // Create or update ZKPassport provider
    if (!this.userIdentityCache[address].identityProviders) {
      this.userIdentityCache[address].identityProviders = [];
    }

    const provider = this.userIdentityCache[address].identityProviders!.find(p => p.type === 'zkpassport');
    const claims: Claim[] = provider?.claims || [];

    // Update or add adulthood claim
    const existingClaimIndex = claims.findIndex(c => c.key === 'adult');
    const claim: Claim = {
      key: 'adult',
      value: isAdult,
      verified: true
    };

    if (existingClaimIndex >= 0) {
      claims[existingClaimIndex] = claim;
    } else {
      claims.push(claim);
    }

    // Create or update provider
    const zkPassportProvider: IdentityProvider = {
      type: 'zkpassport',
      verifiedAt: timestamp,
      uniqueIdentifier,
      claims
    };

    const existingProviderIndex = this.userIdentityCache[address].identityProviders!.findIndex(
      p => p.type === 'zkpassport'
    );

    if (existingProviderIndex >= 0) {
      this.userIdentityCache[address].identityProviders![existingProviderIndex] = zkPassportProvider;
    } else {
      this.userIdentityCache[address].identityProviders!.push(zkPassportProvider);
    }

    // Update last updated timestamp
    this.userIdentityCache[address].lastUpdated = timestamp;

    // Update verification status if user is verified as adult
    if (isAdult) {
      this.userIdentityCache[address].verificationStatus = EVerificationStatus.ENS_ORDINAL_VERIFIED;
    }

    // Notify listeners that the user identity has been updated
    this.notifyRefreshListeners(address);
  }

  /**
   * Update user identity with ZKPassport country disclosure
   */
  updateUserIdentityWithCountry(
    address: string,
    uniqueIdentifier: string,
    country: string
  ): void {
    const timestamp = Date.now();
    
    if (!this.userIdentityCache[address]) {
      // Create new identity entry if it doesn't exist
      this.userIdentityCache[address] = {
        ensName: undefined,
        ordinalDetails: undefined,
        callSign: undefined,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
        verificationStatus: EVerificationStatus.WALLET_CONNECTED,
      };
    }

    // Create or update ZKPassport provider
    if (!this.userIdentityCache[address].identityProviders) {
      this.userIdentityCache[address].identityProviders = [];
    }

    const provider = this.userIdentityCache[address].identityProviders!.find(p => p.type === 'zkpassport');
    const claims: Claim[] = provider?.claims || [];

    // Update or add country claim
    const existingClaimIndex = claims.findIndex(c => c.key === 'country');
    const claim: Claim = {
      key: 'country',
      value: country,
      verified: true
    };

    if (existingClaimIndex >= 0) {
      claims[existingClaimIndex] = claim;
    } else {
      claims.push(claim);
    }

    // Create or update provider
    const zkPassportProvider: IdentityProvider = {
      type: 'zkpassport',
      verifiedAt: timestamp,
      uniqueIdentifier,
      claims
    };

    const existingProviderIndex = this.userIdentityCache[address].identityProviders!.findIndex(
      p => p.type === 'zkpassport'
    );

    if (existingProviderIndex >= 0) {
      this.userIdentityCache[address].identityProviders![existingProviderIndex] = zkPassportProvider;
    } else {
      this.userIdentityCache[address].identityProviders!.push(zkPassportProvider);
    }

    // Update last updated timestamp
    this.userIdentityCache[address].lastUpdated = timestamp;

    // Notify listeners that the user identity has been updated
    this.notifyRefreshListeners(address);
  }

  /**
   * Update user identity with ZKPassport gender disclosure
   */
  updateUserIdentityWithGender(
    address: string,
    uniqueIdentifier: string,
    gender: string
  ): void {
    const timestamp = Date.now();
    
    if (!this.userIdentityCache[address]) {
      // Create new identity entry if it doesn't exist
      this.userIdentityCache[address] = {
        ensName: undefined,
        ordinalDetails: undefined,
        callSign: undefined,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
        verificationStatus: EVerificationStatus.WALLET_CONNECTED,
      };
    }

    // Create or update ZKPassport provider
    if (!this.userIdentityCache[address].identityProviders) {
      this.userIdentityCache[address].identityProviders = [];
    }

    const provider = this.userIdentityCache[address].identityProviders!.find(p => p.type === 'zkpassport');
    const claims: Claim[] = provider?.claims || [];

    // Update or add gender claim
    const existingClaimIndex = claims.findIndex(c => c.key === 'gender');
    const claim: Claim = {
      key: 'gender',
      value: gender,
      verified: true
    };

    if (existingClaimIndex >= 0) {
      claims[existingClaimIndex] = claim;
    } else {
      claims.push(claim);
    }

    // Create or update provider
    const zkPassportProvider: IdentityProvider = {
      type: 'zkpassport',
      verifiedAt: timestamp,
      uniqueIdentifier,
      claims
    };

    const existingProviderIndex = this.userIdentityCache[address].identityProviders!.findIndex(
      p => p.type === 'zkpassport'
    );

    if (existingProviderIndex >= 0) {
      this.userIdentityCache[address].identityProviders![existingProviderIndex] = zkPassportProvider;
    } else {
      this.userIdentityCache[address].identityProviders!.push(zkPassportProvider);
    }

    // Update last updated timestamp
    this.userIdentityCache[address].lastUpdated = timestamp;

    // Notify listeners that the user identity has been updated
    this.notifyRefreshListeners(address);
  }

  /**
   * Map verification status string to enum
   */
  private mapVerificationStatus(status: string): EVerificationStatus {
    switch (status) {
      // Legacy message-cache statuses
      case 'verified-basic':
        return EVerificationStatus.WALLET_CONNECTED;
      case 'verified-owner':
        return EVerificationStatus.ENS_ORDINAL_VERIFIED;
      case 'verifying':
        return EVerificationStatus.WALLET_CONNECTED; // Temporary state during verification

      // Enum string values persisted in LocalDatabase
      case EVerificationStatus.WALLET_UNCONNECTED:
        return EVerificationStatus.WALLET_UNCONNECTED;
      case EVerificationStatus.WALLET_CONNECTED:
        return EVerificationStatus.WALLET_CONNECTED;
      case EVerificationStatus.ENS_ORDINAL_VERIFIED:
        return EVerificationStatus.ENS_ORDINAL_VERIFIED;

      default:
        return EVerificationStatus.WALLET_UNCONNECTED;
    }
  }

  /**
   * Refresh user identity (force re-resolution)
   */
  async refreshUserIdentity(address: string): Promise<void> {
    // Preserve identity providers when refreshing
    const preservedProviders = this.userIdentityCache[address]?.identityProviders;
    
    delete this.userIdentityCache[address];
    
    // Get fresh identity
    await this.getUserIdentity(address);
    
    // Restore identity providers if they existed
    if (preservedProviders && this.userIdentityCache[address]) {
      this.userIdentityCache[address].identityProviders = preservedProviders;
      this.userIdentityCache[address].lastUpdated = Date.now();
    }
  }

  /**
   * Clear user identity cache
   */
  clearUserIdentityCache(): void {
    this.userIdentityCache = {};
  }

  /**
   * Add a refresh listener for when user identity data changes
   */
  addRefreshListener(listener: (address: string) => void): () => void {
    this.refreshListeners.add(listener);
    return () => this.refreshListeners.delete(listener);
  }

  /**
   * Notify all listeners that user identity data has changed
   */
  private notifyRefreshListeners(address: string): void {
    this.refreshListeners.forEach(listener => listener(address));
  }

  /**
   * Get display name for user based on their preferences
   */
  getDisplayName(address: string): string {
    const identity = this.userIdentityCache[address];
    if (!identity) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    if (
      identity.displayPreference === EDisplayPreference.CALL_SIGN &&
      identity.callSign
    ) {
      return identity.callSign;
    }

    if (identity.ensName) {
      return identity.ensName;
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get ZKPassport claims with multi-layer cache support
   */
  async getZKPassportClaims(address: string): Promise<Claim[] | null> {
    // 1. Check in-memory cache first (fastest)
    if (this.userIdentityCache[address]?.identityProviders) {
      const zkPassportProvider = this.userIdentityCache[address].identityProviders?.find(p => p.type === 'zkpassport');
      if (zkPassportProvider) {
        return zkPassportProvider.claims;
      }
    }

    // 2. Check LocalDatabase persistence (warm start)
    const persisted = localDatabase.cache.userIdentities[address];
    if (persisted?.identityProviders) {
      const zkPassportProvider = persisted.identityProviders.find(p => p.type === 'zkpassport');
      if (zkPassportProvider) {
        // Restore in memory cache
        this.userIdentityCache[address] = {
          ...persisted,
          identityProviders: persisted.identityProviders
        };
        return zkPassportProvider.claims;
      }
    }

    // 3. Check Waku message cache (network cache)
    const cacheServiceData = messageManager.messageCache.userIdentities[address];
    if (cacheServiceData?.identityProviders) {
      const zkPassportProvider = cacheServiceData.identityProviders.find(p => p.type === 'zkpassport');
      if (zkPassportProvider) {
        // Store in internal cache for future use
        this.userIdentityCache[address] = {
          ...cacheServiceData,
          identityProviders: cacheServiceData.identityProviders
        };
        return zkPassportProvider.claims;
      }
    }

    // 4. Fetch from blockchain (source of truth)
    return this.resolveZKPassportClaims(address);
  }

  /**
   * Force fresh resolution of ZKPassport claims (bypass caches)
   */
  async getZKPassportClaimsFresh(address: string): Promise<Claim[] | null> {
    return this.resolveZKPassportClaims(address);
  }

  /**
   * Resolve ZKPassport claims from blockchain contract with TTL caching
   */
  private async resolveZKPassportClaims(address: string): Promise<Claim[] | null> {
    try {
      // Check if we have a recent cached version
      const cached = this.userIdentityCache[address]?.identityProviders?.find(p => p.type === 'zkpassport');
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

      // If we have a recent cache and it's still valid, return it
      if (cached && cached.verifiedAt && (now - cached.verifiedAt) < CACHE_TTL) {
        return cached.claims;
      }

      const claimsData = await getVerification(address);
      if (!claimsData) return null;

      const claims: Claim[] = [];
      
      // Process adult claim
      if (claimsData.adult !== undefined) {
        claims.push({
          key: 'adult',
          value: claimsData.adult,
          verified: true
        });
      }
      
      // Process country claim
      if (claimsData.country) {
        claims.push({
          key: 'country',
          value: claimsData.country,
          verified: true
        });
      }
      
      // Process gender claim
      if (claimsData.gender) {
        claims.push({
          key: 'gender',
          value: claimsData.gender,
          verified: true
        });
      }

      // Update identity with claims (this updates all cache layers)
      this.updateUserIdentityWithZKPassportClaims(address, claims);

      return claims;
    } catch (error) {
      console.error('Failed to resolve ZKPassport claims:', error);
      return null;
    }
  }

  /**
   * Update user identity with ZKPassport claims (updates all cache layers)
   */
  updateUserIdentityWithZKPassportClaims(address: string, claims: Claim[]): void {
    const timestamp = Date.now();
    
    // Initialize identity if it doesn't exist
    if (!this.userIdentityCache[address]) {
      this.userIdentityCache[address] = {
        ensName: undefined,
        ordinalDetails: undefined,
        callSign: undefined,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
        verificationStatus: EVerificationStatus.WALLET_CONNECTED,
        identityProviders: []
      };
    }

    // Create or update ZKPassport provider with TTL
    const zkPassportProvider: IdentityProvider = {
      type: 'zkpassport',
      verifiedAt: timestamp,
      expiresAt: timestamp + 24 * 60 * 60 * 1000, // 24 hours validity
      claims: [...claims]
    };

    // Replace or add provider
    const existingProviderIndex = this.userIdentityCache[address].identityProviders!.findIndex(
      p => p.type === 'zkpassport'
    );

    if (existingProviderIndex >= 0) {
      this.userIdentityCache[address].identityProviders![existingProviderIndex] = zkPassportProvider;
    } else {
      this.userIdentityCache[address].identityProviders!.push(zkPassportProvider);
    }

    // Update last updated timestamp
    this.userIdentityCache[address].lastUpdated = timestamp;

    // Update verification status if user has verified claims
    if (claims.some(c => c.verified)) {
      this.userIdentityCache[address].verificationStatus = EVerificationStatus.ENS_ORDINAL_VERIFIED;
    }

    // Notify listeners that the user identity has been updated
    this.notifyRefreshListeners(address);

    // Persist to IndexedDB
    localDatabase.upsertUserIdentity(address, {
      identityProviders: this.userIdentityCache[address].identityProviders,
      lastUpdated: timestamp
    });
  }

  /**
   * Batch resolve multiple user identities for post processing
   */
  async resolveMultipleUsers(addresses: string[]): Promise<Map<string, UserIdentity>> {
    const result = new Map<string, UserIdentity>();
    
    // Process all resolutions in parallel
    await Promise.all(
      addresses.map(async (address) => {
        const identity = await this.getUserIdentity(address);
        if (identity) {
          result.set(address, identity);
        }
      })
    );
    
    return result;
  }
}
