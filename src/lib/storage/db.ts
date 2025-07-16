import Dexie, { Table } from 'dexie';
import { CellMessage, PostMessage, CommentMessage, VoteMessage, ModerateMessage } from '../waku/types';

export interface OutboxMessage {
  id: string;
  type: 'cell' | 'post' | 'comment' | 'vote' | 'moderate';
  data: CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage;
  timestamp: number;
  isPublished: boolean;
}

export class OpChanDatabase extends Dexie {
  cells!: Table<CellMessage>;
  posts!: Table<PostMessage>;
  comments!: Table<CommentMessage>;
  votes!: Table<VoteMessage>;
  moderations!: Table<ModerateMessage>;
  outbox!: Table<OutboxMessage>;

  constructor() {
    super('opchan');
    
    // Version 1: Initial schema
    this.version(1).stores({
      cells: 'id, timestamp',
      posts: 'id, cellId, timestamp',
      comments: 'id, postId, timestamp',
      votes: '&[targetId+author], timestamp',
      moderations: 'targetId, timestamp',
      outbox: 'id, type, timestamp'
    });

    // Version 2: Update outbox schema without isPublished index (boolean indexing is problematic)
    this.version(2).stores({
      cells: 'id, timestamp',
      posts: 'id, cellId, timestamp',
      comments: 'id, postId, timestamp',
      votes: '&[targetId+author], timestamp',
      moderations: 'targetId, timestamp',
      outbox: 'id, type, timestamp'
    }).upgrade(tx => {
      // Migration: set isPublished = false for existing outbox items
      return tx.outbox.toCollection().modify(item => {
        if (item.isPublished === undefined) {
          item.isPublished = false;
        }
      });
    });
  }

  async addToOutbox(message: CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage): Promise<void> {
    const outboxItem: OutboxMessage = {
      id: message.id,
      type: message.type as 'cell' | 'post' | 'comment' | 'vote' | 'moderate',
      data: message,
      timestamp: Date.now(),
      isPublished: false
    };
    
    await this.outbox.put(outboxItem);
  }

  async getUnpublishedMessages(): Promise<OutboxMessage[]> {
    // Get all outbox items and filter manually since boolean indexing can be problematic
    const allItems = await this.outbox.toArray();
    return allItems.filter(item => !item.isPublished);
  }

  async markAsPublished(messageId: string): Promise<void> {
    await this.outbox.update(messageId, { isPublished: true });
  }

  async removeFromOutbox(messageId: string): Promise<void> {
    await this.outbox.delete(messageId);
  }

  async clearOutbox(): Promise<void> {
    // Get all items and delete published ones manually
    const allItems = await this.outbox.toArray();
    const publishedIds = allItems.filter(item => item.isPublished).map(item => item.id);
    if (publishedIds.length > 0) {
      await this.outbox.bulkDelete(publishedIds);
    }
  }

  async isMessagePending(messageId: string): Promise<boolean> {
    const outboxItem = await this.outbox.get(messageId);
    return outboxItem !== undefined && !outboxItem.isPublished;
  }

  async getPendingMessageIds(): Promise<string[]> {
    const unpublished = await this.getUnpublishedMessages();
    return unpublished.map(item => item.id);
  }

  async getOutboxCount(): Promise<number> {
    const unpublished = await this.getUnpublishedMessages();
    return unpublished.length;
  }

  async hydrateMessageCache(): Promise<{
    cells: { [id: string]: CellMessage };
    posts: { [id: string]: PostMessage };
    comments: { [id: string]: CommentMessage };
    votes: { [key: string]: VoteMessage };
    moderations: { [targetId: string]: ModerateMessage };
  }> {
    const [cells, posts, comments, votes, moderations] = await Promise.all([
      this.cells.toArray(),
      this.posts.toArray(),
      this.comments.toArray(),
      this.votes.toArray(),
      this.moderations.toArray()
    ]);

    const cellsMap: { [id: string]: CellMessage } = {};
    cells.forEach(cell => {
      cellsMap[cell.id] = cell;
    });

    const postsMap: { [id: string]: PostMessage } = {};
    posts.forEach(post => {
      postsMap[post.id] = post;
    });

    const commentsMap: { [id: string]: CommentMessage } = {};
    comments.forEach(comment => {
      commentsMap[comment.id] = comment;
    });

    const votesMap: { [key: string]: VoteMessage } = {};
    votes.forEach(vote => {
      const voteKey = `${vote.targetId}:${vote.author}`;
      votesMap[voteKey] = vote;
    });

    const moderationsMap: { [targetId: string]: ModerateMessage } = {};
    moderations.forEach(moderation => {
      moderationsMap[moderation.targetId] = moderation;
    });

    return {
      cells: cellsMap,
      posts: postsMap,
      comments: commentsMap,
      votes: votesMap,
      moderations: moderationsMap
    };
  }

  /**
   * Reset the entire database - useful for debugging or clearing corrupted data
   */
  async resetDatabase(): Promise<void> {
    await this.delete();
    await this.open();
    console.log("Database reset completed");
  }
}

export const db = new OpChanDatabase();

// For debugging: expose database reset function globally
if (typeof window !== 'undefined') {
  (window as any).resetOpChanDB = () => db.resetDatabase();
}