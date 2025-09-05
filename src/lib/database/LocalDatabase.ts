import {
  MessageType,
  CellCache,
  PostCache,
  CommentCache,
  VoteCache,
  UserIdentityCache,
  ModerateMessage,
  UserProfileUpdateMessage,
  CellMessage,
  PostMessage,
  CommentMessage,
  VoteMessage,
} from '@/types/waku';
import { OpchanMessage } from '@/types/forum';
import { MessageValidator } from '@/lib/utils/MessageValidator';
import { EVerificationStatus } from '@/types/identity';
import { openLocalDB, STORE, StoreName } from '@/lib/database/schema';

export interface LocalDatabaseCache {
  cells: CellCache;
  posts: PostCache;
  comments: CommentCache;
  votes: VoteCache;
  moderations: { [targetId: string]: ModerateMessage };
  userIdentities: UserIdentityCache;
}

/**
 * Minimal in-memory LocalDatabase
 * Mirrors CacheService message handling to enable incremental migration.
 */
export class LocalDatabase {
  private processedMessageIds: Set<string> = new Set();
  private validator: MessageValidator;
  private db: IDBDatabase | null = null;
  private _isSyncing: boolean = false;
  private _lastSync: number | null = null;
  private pendingIds: Set<string> = new Set();
  private pendingListeners: Set<() => void> = new Set();

  public readonly cache: LocalDatabaseCache = {
    cells: {},
    posts: {},
    comments: {},
    votes: {},
    moderations: {},
    userIdentities: {},
  };

  constructor() {
    this.validator = new MessageValidator();
  }

  /**
   * Open IndexedDB and hydrate in-memory cache.
   */
  public async open(): Promise<void> {
    this.db = await openLocalDB();
    await this.hydrateFromIndexedDB();
    await this.hydratePendingFromMeta();
  }

  /**
   * Apply a message into the LocalDatabase.
   * Returns true if the message was newly processed and stored.
   */
  public async applyMessage(message: unknown): Promise<boolean> {
    if (!(await this.validator.isValidMessage(message))) {
      const partialMsg = message as {
        id?: unknown;
        type?: unknown;
        signature?: unknown;
        browserPubKey?: unknown;
      };
      console.warn('LocalDatabase: Rejecting invalid message', {
        messageId: partialMsg?.id,
        messageType: partialMsg?.type,
        hasSignature: !!partialMsg?.signature,
        hasBrowserPubKey: !!partialMsg?.browserPubKey,
      });
      return false;
    }

    const validMessage = message as OpchanMessage;
    const messageKey = `${validMessage.type}:${validMessage.id}:${validMessage.timestamp}`;
    if (this.processedMessageIds.has(messageKey)) {
      return false;
    }

    this.processedMessageIds.add(messageKey);
    this.storeMessage(validMessage);
    return true;
  }

  /**
   * Temporary alias to ease migration from CacheService.updateCache
   */
  public async updateCache(message: unknown): Promise<boolean> {
    return this.applyMessage(message);
  }

  public clear(): void {
    this.processedMessageIds.clear();
    this.cache.cells = {};
    this.cache.posts = {};
    this.cache.comments = {};
    this.cache.votes = {};
    this.cache.moderations = {};
    this.cache.userIdentities = {};
  }

  private storeMessage(message: OpchanMessage): void {
    switch (message.type) {
      case MessageType.CELL:
        if (
          !this.cache.cells[message.id] ||
          this.cache.cells[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.cells[message.id] = message;
          this.put(STORE.CELLS, message);
        }
        break;
      case MessageType.POST:
        if (
          !this.cache.posts[message.id] ||
          this.cache.posts[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.posts[message.id] = message;
          this.put(STORE.POSTS, message);
        }
        break;
      case MessageType.COMMENT:
        if (
          !this.cache.comments[message.id] ||
          this.cache.comments[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.comments[message.id] = message;
          this.put(STORE.COMMENTS, message);
        }
        break;
      case MessageType.VOTE: {
        const voteKey = `${message.targetId}:${message.author}`;
        if (
          !this.cache.votes[voteKey] ||
          this.cache.votes[voteKey]?.timestamp !== message.timestamp
        ) {
          this.cache.votes[voteKey] = message;
          this.put(STORE.VOTES, { key: voteKey, ...message });
        }
        break;
      }
      case MessageType.MODERATE: {
        const modMsg = message as ModerateMessage;
        if (
          !this.cache.moderations[modMsg.targetId] ||
          this.cache.moderations[modMsg.targetId]?.timestamp !==
            modMsg.timestamp
        ) {
          this.cache.moderations[modMsg.targetId] = modMsg;
          this.put(STORE.MODERATIONS, modMsg);
        }
        break;
      }
      case MessageType.USER_PROFILE_UPDATE: {
        const profileMsg = message as UserProfileUpdateMessage;
        const { author, callSign, displayPreference, timestamp } = profileMsg;

        if (
          !this.cache.userIdentities[author] ||
          this.cache.userIdentities[author]?.lastUpdated !== timestamp
        ) {
          this.cache.userIdentities[author] = {
            ensName: undefined,
            ordinalDetails: undefined,
            callSign,
            displayPreference,
            lastUpdated: timestamp,
            verificationStatus: EVerificationStatus.UNVERIFIED,
          };
          // Persist with address keyPath
          this.put(STORE.USER_IDENTITIES, {
            address: author,
            ...this.cache.userIdentities[author],
          });
        }
        break;
      }
      default:
        console.warn('LocalDatabase: Received message with unknown type');
        break;
    }

    // Update last sync time using local receipt time for accurate UI
    this.updateLastSync(Date.now());
  }

  /**
   * Hydrate cache from IndexedDB on warm start
   */
  private async hydrateFromIndexedDB(): Promise<void> {
    if (!this.db) return;

    const [cells, posts, comments, votes, moderations, identities]: [
      CellMessage[],
      PostMessage[],
      CommentMessage[],
      (VoteMessage & { key: string })[],
      ModerateMessage[],
      ({ address: string } & UserIdentityCache[string])[],
    ] = await Promise.all([
      this.getAllFromStore<CellMessage>(STORE.CELLS),
      this.getAllFromStore<PostMessage>(STORE.POSTS),
      this.getAllFromStore<CommentMessage>(STORE.COMMENTS),
      this.getAllFromStore<VoteMessage & { key: string }>(STORE.VOTES),
      this.getAllFromStore<ModerateMessage>(STORE.MODERATIONS),
      this.getAllFromStore<{ address: string } & UserIdentityCache[string]>(
        STORE.USER_IDENTITIES
      ),
    ]);

    this.cache.cells = Object.fromEntries(cells.map(c => [c.id, c]));
    this.cache.posts = Object.fromEntries(posts.map(p => [p.id, p]));
    this.cache.comments = Object.fromEntries(comments.map(cm => [cm.id, cm]));
    this.cache.votes = Object.fromEntries(
      votes.map(v => {
        const { key, ...rest } = v;
        const vote: VoteMessage = rest as VoteMessage;
        return [key, vote];
      })
    );
    this.cache.moderations = Object.fromEntries(
      moderations.map(m => [m.targetId, m])
    );
    this.cache.userIdentities = Object.fromEntries(
      identities.map(u => {
        const { address, ...record } = u;
        return [address, record];
      })
    );
  }

  private async hydratePendingFromMeta(): Promise<void> {
    if (!this.db) return;
    const meta = await this.getAllFromStore<{ key: string; value: unknown }>(
      STORE.META
    );
    meta
      .filter(
        entry =>
          typeof entry.key === 'string' && entry.key.startsWith('pending:')
      )
      .forEach(entry => {
        const id = (entry.key as string).substring('pending:'.length);
        this.pendingIds.add(id);
      });
  }

  private getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T[]);
    });
  }

  private put(
    storeName: StoreName,
    value:
      | CellMessage
      | PostMessage
      | CommentMessage
      | (VoteMessage & { key: string })
      | ModerateMessage
      | ({ address: string } & UserIdentityCache[string])
      | { key: string; value: unknown }
  ): void {
    if (!this.db) return;
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
  }

  public getSyncState(): { lastSync: number | null; isSyncing: boolean } {
    return { lastSync: this._lastSync, isSyncing: this._isSyncing };
  }

  public setSyncing(isSyncing: boolean): void {
    this._isSyncing = isSyncing;
  }

  public updateLastSync(timestamp: number): void {
    this._lastSync = Math.max(this._lastSync ?? 0, timestamp);
    // persist in META store (best-effort)
    if (!this.db) return;
    const tx = this.db.transaction(STORE.META, 'readwrite');
    const store = tx.objectStore(STORE.META);
    store.put({ key: 'lastSync', value: this._lastSync });
  }

  public markPending(id: string): void {
    this.pendingIds.add(id);
    if (!this.db) return;
    const tx = this.db.transaction(STORE.META, 'readwrite');
    const store = tx.objectStore(STORE.META);
    store.put({ key: `pending:${id}`, value: true });
    this.pendingListeners.forEach(l => l());
  }

  public clearPending(id: string): void {
    this.pendingIds.delete(id);
    if (!this.db) return;
    const tx = this.db.transaction(STORE.META, 'readwrite');
    const store = tx.objectStore(STORE.META);
    store.delete(`pending:${id}`);
    this.pendingListeners.forEach(l => l());
  }

  public isPending(id: string): boolean {
    return this.pendingIds.has(id);
  }

  public onPendingChange(listener: () => void): () => void {
    this.pendingListeners.add(listener);
    return () => this.pendingListeners.delete(listener);
  }
}

export const localDatabase = new LocalDatabase();
