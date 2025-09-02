import {
  MessageType,
  CellCache,
  PostCache,
  CommentCache,
  VoteCache,
  ModerateMessage,
} from '../../../types/waku';
import { OpchanMessage } from '@/types/forum';
import { MessageValidator } from '@/lib/utils/MessageValidator';

export interface MessageCache {
  cells: CellCache;
  posts: PostCache;
  comments: CommentCache;
  votes: VoteCache;
  moderations: { [targetId: string]: ModerateMessage };
}

export class CacheService {
  private processedMessageIds: Set<string> = new Set();
  private validator: MessageValidator;

  public readonly cache: MessageCache = {
    cells: {},
    posts: {},
    comments: {},
    votes: {},
    moderations: {},
  };

  constructor() {
    this.validator = new MessageValidator();
  }

  public updateCache(message: unknown): boolean {
    if (!this.validator.isValidMessage(message)) {
      const partialMsg = message as {
        id?: unknown;
        type?: unknown;
        signature?: unknown;
        browserPubKey?: unknown;
      };
      console.warn('CacheService: Rejecting invalid message', {
        messageId: partialMsg?.id,
        messageType: partialMsg?.type,
        hasSignature: !!partialMsg?.signature,
        hasBrowserPubKey: !!partialMsg?.browserPubKey,
      });
      return false; // Reject invalid messages
    }

    // At this point we know message is valid OpchanMessage due to validation above
    const validMessage = message as OpchanMessage;

    // Check if we've already processed this exact message
    const messageKey = `${validMessage.type}:${validMessage.id}:${validMessage.timestamp}`;
    if (this.processedMessageIds.has(messageKey)) {
      return false; // Already processed
    }

    this.processedMessageIds.add(messageKey);
    this.storeMessage(validMessage);
    return true; // Newly processed
  }

  private storeMessage(message: OpchanMessage): void {
    switch (message.type) {
      case MessageType.CELL:
        if (
          !this.cache.cells[message.id] ||
          this.cache.cells[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.cells[message.id] = message;
        }
        break;
      case MessageType.POST:
        if (
          !this.cache.posts[message.id] ||
          this.cache.posts[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.posts[message.id] = message;
        }
        break;
      case MessageType.COMMENT:
        if (
          !this.cache.comments[message.id] ||
          this.cache.comments[message.id]?.timestamp !== message.timestamp
        ) {
          this.cache.comments[message.id] = message;
        }
        break;
      case MessageType.VOTE: {
        const voteKey = `${message.targetId}:${message.author}`;
        if (
          !this.cache.votes[voteKey] ||
          this.cache.votes[voteKey]?.timestamp !== message.timestamp
        ) {
          this.cache.votes[voteKey] = message;
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
        }
        break;
      }
      default:
        console.warn('Received message with unknown type');
        break;
    }
  }

  public clear(): void {
    this.processedMessageIds.clear();
    this.cache.cells = {};
    this.cache.posts = {};
    this.cache.comments = {};
    this.cache.votes = {};
    this.cache.moderations = {};
  }
}
