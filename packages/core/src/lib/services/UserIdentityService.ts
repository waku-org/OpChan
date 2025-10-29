import { EVerificationStatus, EDisplayPreference } from '../../types/identity';
import {
  UnsignedUserProfileUpdateMessage,
  UserProfileUpdateMessage,
  MessageType,
  UserIdentityCache,
} from '../../types/waku';
import { MessageService } from './MessageService';
import { localDatabase } from '../database/LocalDatabase';
import { EthereumWalletHelpers } from '../wallet/EthereumWallet';
import type { PublicClient } from 'viem';

export interface UserIdentity {
  address: `0x${string}`;
  ensName?: string;
  ensAvatar?: string;
  callSign?: string;
  displayPreference: EDisplayPreference;
  displayName: string;
  lastUpdated: number;
  verificationStatus: EVerificationStatus;
}

export class UserIdentityService {
  private messageService: MessageService;
  private publicClient: PublicClient | null = null;
  private refreshListeners: Set<(address: string) => void> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(messageService: MessageService, publicClient?: PublicClient) {
    this.messageService = messageService;
    this.publicClient = publicClient || null;
  }

  /**
   * Set the public client for ENS resolution
   */
  setPublicClient(publicClient: PublicClient): void {
    this.publicClient = publicClient;
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
      address: address as `0x${string}`,
      ...cached,
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
  getDisplayName({address, ensName, displayPreference}: {address: string, ensName?: string | null, displayPreference?: EDisplayPreference}): string {
    const storedIdentity = localDatabase.cache.userIdentities[address];
    if (
      storedIdentity?.callSign &&
      displayPreference === EDisplayPreference.CALL_SIGN 
    ) {
      return storedIdentity.callSign;
    }

    if (ensName) {
      return ensName;
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
   * Resolve user identity from ENS
   */
  private async resolveUserIdentity(
    address: string
  ): Promise<UserIdentity | null> {
    try {
      console.log('resolveUserIdentity', address);
      
      // Only resolve ENS for Ethereum addresses
      if (!address.startsWith('0x')) {
        return null;
      }

      const ensData = await this.resolveENSName(address as `0x${string}`);

      let verificationStatus: EVerificationStatus;
      if (ensData?.name) {
        verificationStatus = EVerificationStatus.ENS_VERIFIED;
      } else {
        verificationStatus = EVerificationStatus.WALLET_CONNECTED;
      }

      const displayPreference = localDatabase.cache.userIdentities[address]?.displayPreference ?? EDisplayPreference.WALLET_ADDRESS;

      return {
        address: address as `0x${string}`,
        ensName: ensData?.name || undefined,
        ensAvatar: ensData?.avatar || undefined,
        callSign: undefined, // Will be populated from Waku messages
        displayPreference: displayPreference,
        displayName: this.getDisplayName({address, ensName: ensData?.name, displayPreference}),
        lastUpdated: Date.now(),
        verificationStatus,
      };
    } catch (error) {
      console.error('Failed to resolve user identity:', error);
      return null;
    }
  }

  /**
   * Resolve ENS name and avatar from Ethereum address with caching
   */
  private async resolveENSName(address: `0x${string}`): Promise<{ name: string | null; avatar: string | null }> {
    // Prefer previously persisted ENS if recent
    const cached = localDatabase.cache.userIdentities[address];
    if (cached?.ensName && cached.lastUpdated > Date.now() - 300000) {
      return { name: cached.ensName, avatar: cached.ensAvatar || null };
    }

    return this.doResolveENSName(address);
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
      address: address as `0x${string}`,
      ensName: record.ensName,
      ensAvatar: record.ensAvatar,
      callSign: record.callSign,
      displayPreference: record.displayPreference,
      displayName: this.getDisplayName({address, ensName: record.ensName, displayPreference: record.displayPreference}),
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
      const ensData = await this.resolveENSName(address as `0x${string}`);
      if (ensData.name) {
        const updated: UserIdentity = {
          ...identity,
          ensName: ensData.name,
          ensAvatar: ensData.avatar || undefined,
          verificationStatus: EVerificationStatus.ENS_VERIFIED,
          lastUpdated: Date.now(),
        };

        await localDatabase.upsertUserIdentity(address, {
          ensName: ensData.name,
          ensAvatar: ensData.avatar || undefined,
          verificationStatus: EVerificationStatus.ENS_VERIFIED,
          lastUpdated: updated.lastUpdated,
        });

        return updated;
      }
    }
    return identity;
  }

  private async doResolveENSName(address: `0x${string}`): Promise<{ name: string | null; avatar: string | null }> {
    try {
      if (!this.publicClient) {
        console.warn('No publicClient available for ENS resolution');
        return { name: null, avatar: null };
      }

      return await EthereumWalletHelpers.resolveENS(this.publicClient, address);
    } catch (error) {
      console.error('Failed to resolve ENS name:', error);
      return { name: null, avatar: null };
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
      case 'ens-ordinal-verified': // Legacy value
        return EVerificationStatus.ENS_VERIFIED;
      case 'verifying':
        return EVerificationStatus.WALLET_CONNECTED; // Temporary state during verification

      // Enum string values persisted in LocalDatabase
      case EVerificationStatus.ANONYMOUS:
        return EVerificationStatus.ANONYMOUS;
      case EVerificationStatus.WALLET_UNCONNECTED:
        return EVerificationStatus.WALLET_UNCONNECTED;
      case EVerificationStatus.WALLET_CONNECTED:
        return EVerificationStatus.WALLET_CONNECTED;
      case EVerificationStatus.ENS_VERIFIED:
        return EVerificationStatus.ENS_VERIFIED;

      default:
        return EVerificationStatus.WALLET_UNCONNECTED;
    }
  }
}
