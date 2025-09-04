import { EVerificationStatus, EDisplayPreference } from '@/types/identity';
import {
  UnsignedUserProfileUpdateMessage,
  UserProfileUpdateMessage,
  MessageType,
  UserIdentityCache,
} from '@/types/waku';
import { MessageService } from './MessageService';
import messageManager from '@/lib/waku';
import { localDatabase } from '@/lib/database/LocalDatabase';

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

export class UserIdentityService {
  private messageService: MessageService;
  private userIdentityCache: UserIdentityCache = {};

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
      return {
        address,
        ensName: cached.ensName,
        ordinalDetails: cached.ordinalDetails,
        callSign: cached.callSign,
        displayPreference:
          cached.displayPreference === 'call-sign'
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: cached.lastUpdated,
        verificationStatus: this.mapVerificationStatus(
          cached.verificationStatus
        ),
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
      return {
        address,
        ensName: persisted.ensName,
        ordinalDetails: persisted.ordinalDetails,
        callSign: persisted.callSign,
        displayPreference:
          persisted.displayPreference === 'call-sign'
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: persisted.lastUpdated,
        verificationStatus: this.mapVerificationStatus(
          persisted.verificationStatus
        ),
      };
    }

    // Fallback: Check Waku message cache
    const cacheServiceData = messageManager.messageCache.userIdentities[address];

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

      return {
        address,
        ensName: cacheServiceData.ensName,
        ordinalDetails: cacheServiceData.ordinalDetails,
        callSign: cacheServiceData.callSign,
        displayPreference:
          cacheServiceData.displayPreference === 'call-sign'
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: cacheServiceData.lastUpdated,
        verificationStatus: this.mapVerificationStatus(
          cacheServiceData.verificationStatus
        ),
      };
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
        displayPreference:
          identity.displayPreference === EDisplayPreference.CALL_SIGN
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
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
      displayPreference:
        cached.displayPreference === 'call-sign'
          ? EDisplayPreference.CALL_SIGN
          : EDisplayPreference.WALLET_ADDRESS,
      lastUpdated: cached.lastUpdated,
      verificationStatus: this.mapVerificationStatus(cached.verificationStatus),
    }));
  }

  /**
   * Update user profile via Waku message
   */
  async updateUserProfile(
    address: string,
    callSign: string,
    displayPreference: EDisplayPreference
  ): Promise<boolean> {
    try {
      if (import.meta.env?.DEV) {
        console.debug('UserIdentityService: updating profile', { address });
      }

      const unsignedMessage: UnsignedUserProfileUpdateMessage = {
        id: crypto.randomUUID(),
        type: MessageType.USER_PROFILE_UPDATE,
        timestamp: Date.now(),
        author: address,
        callSign,
        displayPreference:
          displayPreference === EDisplayPreference.CALL_SIGN
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
      };

      if (import.meta.env?.DEV) {
        console.debug('UserIdentityService: created unsigned message');
      }

      const signedMessage =
        await this.messageService.signAndBroadcastMessage(unsignedMessage);

      if (import.meta.env?.DEV) {
        console.debug('UserIdentityService: message broadcast result', !!signedMessage);
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
        EVerificationStatus.UNVERIFIED;
      if (ensName || ordinalDetails) {
        verificationStatus = EVerificationStatus.VERIFIED_OWNER;
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
      // For now, return null - ENS resolution can be added later
      // This would typically call an ENS resolver API
      return null;
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
    if (address.startsWith('0x')) {
      return null; // Not a Bitcoin address
    }

    try {
      // For now, return null - Ordinal resolution can be added later
      // This would typically call an Ordinal API
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
        displayPreference:
          displayPreference === EDisplayPreference.CALL_SIGN ? EDisplayPreference.CALL_SIGN : EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
        verificationStatus: EVerificationStatus.UNVERIFIED,
      };
    }

    // Update only if this message is newer
    if (timestamp > this.userIdentityCache[author].lastUpdated) {
      this.userIdentityCache[author] = {
        ...this.userIdentityCache[author],
        callSign,
        displayPreference:
          displayPreference === EDisplayPreference.CALL_SIGN
            ? EDisplayPreference.CALL_SIGN
            : EDisplayPreference.WALLET_ADDRESS,
        lastUpdated: timestamp,
      };
    }
  }

  /**
   * Map verification status string to enum
   */
  private mapVerificationStatus(status: string): EVerificationStatus {
    switch (status) {
      case 'verified-basic':
        return EVerificationStatus.VERIFIED_BASIC;
      case 'verified-owner':
        return EVerificationStatus.VERIFIED_OWNER;
      case 'verifying':
        return EVerificationStatus.VERIFYING;
      default:
        return EVerificationStatus.UNVERIFIED;
    }
  }

  /**
   * Refresh user identity (force re-resolution)
   */
  async refreshUserIdentity(address: string): Promise<void> {
    delete this.userIdentityCache[address];
    await this.getUserIdentity(address);
  }

  /**
   * Clear user identity cache
   */
  clearUserIdentityCache(): void {
    this.userIdentityCache = {};
  }

  /**
   * Get display name for user based on their preferences
   */
  getDisplayName(address: string): string {
    const identity = this.userIdentityCache[address];
    if (!identity) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    if (identity.displayPreference === 'call-sign' && identity.callSign) {
      return identity.callSign;
    }

    if (identity.ensName) {
      return identity.ensName;
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
