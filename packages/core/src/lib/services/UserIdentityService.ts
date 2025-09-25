import { EVerificationStatus, EDisplayPreference } from '../../types/identity';
import {
  UnsignedUserProfileUpdateMessage,
  UserProfileUpdateMessage,
  MessageType,
  UserIdentityCache,
} from '../../types/waku';
import { MessageService } from './MessageService';
import { localDatabase } from '../database/LocalDatabase';
import { walletManager, WalletManager } from '../wallet';

export interface UserIdentity {
  address: string;
  ensName?: string;
  ordinalDetails?: {
    ordinalId: string;
    ordinalDetails: string;
  };
  callSign?: string;
  displayPreference: EDisplayPreference;
  displayName: string;
  lastUpdated: number;
  verificationStatus: EVerificationStatus;
}

export class UserIdentityService {
  private messageService: MessageService;
  private refreshListeners: Set<(address: string) => void> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  // ===== PUBLIC METHODS =====

  /**
   * Unified identity getter. When opts.fresh === true, bypass caches.
   */
  async getIdentity(
    address: string,
    opts?: { fresh?: boolean }
  ): Promise<UserIdentity | null> {
    console.log('getIdentity', address, opts);
    if (opts?.fresh) {
      return this.getUserIdentityFresh(address);
    }

    // Debounce rapid calls for non-fresh path
    if (this.debounceTimers.has(address)) {
      clearTimeout(this.debounceTimers.get(address)!);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(address);
        const result = await this.getUserIdentityInternal(address);
        resolve(result);
      }, 100);
      this.debounceTimers.set(address, timer);
    });
  }

  /**
   * Force a fresh identity resolution bypassing caches and LocalDatabase.
   * Useful for explicit verification flows where we must hit upstream resolvers.
   */
  async getUserIdentityFresh(address: string): Promise<UserIdentity | null> {
    const identity = await this.resolveUserIdentity(address);

    if (identity) {
      // Persist the fresh identity to LocalDatabase
      await localDatabase.upsertUserIdentity(address, identity);
    }
    return identity;
  }

  /**
   * Get all cached user identities
   */
  getAll(): UserIdentity[] {
    return Object.entries(localDatabase.cache.userIdentities).map(([address, cached]) => ({
      address,
      ensName: cached.ensName,
      ordinalDetails: cached.ordinalDetails,
      callSign: cached.callSign,
      displayPreference: cached.displayPreference,
      displayName: this.getDisplayName(address),
      lastUpdated: cached.lastUpdated,
      verificationStatus: this.mapVerificationStatus(cached.verificationStatus),
    }));
  }

  /**
   * New contract: return result and updated identity.
   */
  async updateProfile(
    address: string,
    updates: { callSign?: string; displayPreference?: EDisplayPreference }
  ): Promise<{ ok: true; identity: UserIdentity } | { ok: false; error: Error }>{
    try {
      const callSign = updates.callSign?.trim() || undefined;
      const displayPreference =
        updates.displayPreference ??
        localDatabase.cache.userIdentities[address]?.displayPreference ??
        EDisplayPreference.WALLET_ADDRESS;

      const timestamp = Date.now();
      const unsignedMessage: UnsignedUserProfileUpdateMessage = {
        id: crypto.randomUUID(),
        type: MessageType.USER_PROFILE_UPDATE,
        timestamp,
        author: address,
        displayPreference,
      };
      if (callSign) unsignedMessage.callSign = callSign;

      const signedMessage = await this.messageService.signAndBroadcastMessage(unsignedMessage);
      if (!signedMessage) return { ok: false, error: new Error('Broadcast failed') };

      const profileMessage: UserProfileUpdateMessage = {
        id: unsignedMessage.id,
        type: MessageType.USER_PROFILE_UPDATE,
        timestamp,
        author: address,
        displayPreference,
        signature: signedMessage.signature,
        browserPubKey: signedMessage.browserPubKey,
        delegationProof: signedMessage.delegationProof,
        ...(callSign ? { callSign } : {}),
      };

      // Persist, notify
      await localDatabase.applyMessage(profileMessage);
      this.notifyRefreshListeners(address);

      const identity = await this.getIdentity(address);
      if (!identity) return { ok: false, error: new Error('Identity unavailable') };
      return { ok: true, identity };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /**
   * Update user identity from Waku message
   */
  updateUserIdentityFromMessage(message: UserProfileUpdateMessage): void {
    // No-op: LocalDatabase.applyMessage mutates the canonical cache.
    // We only need to notify listeners to refresh their local views.
    this.notifyRefreshListeners(message.author);
  }

  /**
   * Refresh user identity (force re-resolution)
   */
  async refreshIdentity(address: string): Promise<void> {
    await this.getIdentity(address, { fresh: true });
  }

  /**
   * Clear user identity cache
   */
  clearCache(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Subscribe with identity payload
   */
  subscribe(
    listener: (address: string, identity: UserIdentity | null) => void
  ): () => void {
    const wrapped = async (address: string) => {
      const record = localDatabase.cache.userIdentities[address];
      const identity = record
        ? this.buildUserIdentityFromRecord(address, record)
        : await this.getIdentity(address);
      listener(address, identity);
    };
    this.refreshListeners.add(wrapped);
    return () => this.refreshListeners.delete(wrapped);
  }

  /**
   * Get display name for user based on their preferences
   */
  getDisplayName(address: string): string {
    const identity = localDatabase.cache.userIdentities[address];

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

  // ===== PRIVATE METHODS =====

  /**
   * Internal method to get user identity without debouncing
   */
  private async getUserIdentityInternal(address: string): Promise<UserIdentity | null> {
    const record = localDatabase.cache.userIdentities[address];
    if (record) {
      let identity = this.buildUserIdentityFromRecord(address, record);
      identity = await this.ensureEnsEnriched(address, identity);
      return identity;
    }

    // Try to resolve identity from various sources
    const resolved = await this.resolveUserIdentity(address);
    if (resolved) {
      // Persist the resolved identity to LocalDatabase for future use
      await localDatabase.upsertUserIdentity(address, resolved);

      return resolved;
    }

    return null;
  }

  /**
   * Resolve user identity from various sources
   */
  private async resolveUserIdentity(
    address: string
  ): Promise<UserIdentity | null> {
    try {
      console.log('resolveUserIdentity', address);
      const [ensName, ordinalDetails] = await Promise.all([
        this.resolveENSName(address),
        this.resolveOrdinalDetails(address),
      ]);

      // Default to wallet address display preference
      const defaultDisplayPreference: EDisplayPreference =
        EDisplayPreference.WALLET_ADDRESS;

      const isWalletConnected = WalletManager.hasInstance()
        ? walletManager.getInstance().isConnected()
        : false;
      let verificationStatus: EVerificationStatus;
      if (ensName || ordinalDetails) {
        verificationStatus = EVerificationStatus.ENS_ORDINAL_VERIFIED;
      } else {
        verificationStatus = isWalletConnected ? EVerificationStatus.WALLET_CONNECTED : EVerificationStatus.WALLET_UNCONNECTED;
      }


      return {
        address,
        ensName: ensName || undefined,
        ordinalDetails: ordinalDetails || undefined,
        callSign: undefined, // Will be populated from Waku messages
        displayPreference: defaultDisplayPreference,
        displayName: this.getDisplayName(address),
        lastUpdated: Date.now(),
        verificationStatus,
      };
    } catch (error) {
      console.error('Failed to resolve user identity:', error);
      return null;
    }
  }

  /**
   * Resolve ENS name from Ethereum address with caching to prevent multiple calls
   */
  private async resolveENSName(address: string): Promise<string | null> {
    if (!address.startsWith('0x')) {
      return null; // Not an Ethereum address
    }

    // Prefer previously persisted ENS if recent
    const cached = localDatabase.cache.userIdentities[address];
    if (cached?.ensName && cached.lastUpdated > Date.now() - 300000) {
      return cached.ensName;
    }

    return this.doResolveENSName(address);
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
   * Notify all listeners that user identity data has changed
   */
  private notifyRefreshListeners(address: string): void {
    this.refreshListeners.forEach(listener => listener(address));
  }

  // ===== HELPER METHODS =====

  /**
   * Normalize a cached identity record into a strongly-typed UserIdentity
   */
  private buildUserIdentityFromRecord(
    address: string,
    record: UserIdentityCache[string]
  ): UserIdentity {
    return {
      address,
      ensName: record.ensName,
      ordinalDetails: record.ordinalDetails,
      callSign: record.callSign,
      displayPreference: record.displayPreference,
      displayName: this.getDisplayName(address),
      lastUpdated: record.lastUpdated,
      verificationStatus: this.mapVerificationStatus(record.verificationStatus),
    };
  }

  /**
   * Ensure ENS is enriched if missing. Persists updates and keeps caches in sync.
   */
  private async ensureEnsEnriched(
    address: string,
    identity: UserIdentity
  ): Promise<UserIdentity> {
    if (!identity.ensName && address.startsWith('0x')) {
      const ensName = await this.resolveENSName(address);
      if (ensName) {
        const updated: UserIdentity = {
          ...identity,
          ensName,
          verificationStatus: EVerificationStatus.ENS_ORDINAL_VERIFIED,
          lastUpdated: Date.now(),
        };

        await localDatabase.upsertUserIdentity(address, {
          ensName,
          verificationStatus: EVerificationStatus.ENS_ORDINAL_VERIFIED,
          lastUpdated: updated.lastUpdated,
        });

        return updated;
      }
    }
    return identity;
  }

  private async doResolveENSName(address: string): Promise<string | null> {
    try {
      // Resolve ENS via centralized WalletManager helper
      const ensName = await WalletManager.resolveENS(address);
      return ensName || null;
    } catch (error) {
      console.error('Failed to resolve ENS name:', error);
      return null;
    }
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
}
