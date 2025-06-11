import { MessageType } from '../types';
import { SDSEnhancedMessage } from '../sds/types';

// Mock Waku SDK
jest.mock('@waku/sdk', () => ({
  createLightNode: jest.fn().mockResolvedValue({
    lightPush: {
      send: jest.fn().mockResolvedValue({ success: true }),
    },
    filter: {
      subscribe: jest.fn().mockResolvedValue({
        error: null,
        results: { successes: [{}] },
        unsubscribe: jest.fn(),
      }),
    },
    store: {
      queryWithOrderedCallback: jest.fn(),
    },
    getConnectedPeers: jest.fn().mockResolvedValue(['peer1']),
    stop: jest.fn(),
  }),
  createEncoder: jest.fn().mockReturnValue({}),
  createDecoder: jest.fn().mockReturnValue({}),
}));

// Mock other dependencies
jest.mock('../lightpush_filter');
jest.mock('../store');

describe('MessageManager with SDS', () => {
  let MessageManager: any;
  let messageManager: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../index');
    messageManager = module.default;
    MessageManager = module.MessageManager;
  });

  describe('updateCache with SDS', () => {
    it('should handle non-vote messages without SDS', () => {
      const postMessage = {
        type: MessageType.POST,
        id: 'post-1',
        cellId: 'general',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        author: '0x123',
      };

      // Access private method through prototype
      MessageManager.prototype.updateCache.call(messageManager, postMessage);

      expect(messageManager.messageCache.posts['post-1']).toEqual(postMessage);
    });

    it('should update vote cache with new vote', () => {
      const voteMessage = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now(),
        author: '0x123',
      };

      MessageManager.prototype.updateCache.call(messageManager, voteMessage);

      const voteKey = 'post-1:0x123';
      expect(messageManager.messageCache.votes[voteKey]).toEqual(voteMessage);
    });

    it('should respect causal ordering for votes with SDS metadata', () => {
      const voteKey = 'post-1:0x123';

      // First vote with lower Lamport timestamp
      const olderVote: SDSEnhancedMessage = {
        type: MessageType.VOTE as any,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now(),
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 5,
          causalHistory: [],
        },
      };

      MessageManager.prototype.updateCache.call(messageManager, olderVote);
      expect(messageManager.messageCache.votes[voteKey]).toEqual(olderVote);

      // Newer vote with higher Lamport timestamp
      const newerVote: SDSEnhancedMessage = {
        type: MessageType.VOTE as any,
        id: 'vote-2',
        targetId: 'post-1',
        value: -1,
        timestamp: Date.now() - 1000, // older wall clock time
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 10,
          causalHistory: ['vote-1'],
        },
      };

      MessageManager.prototype.updateCache.call(messageManager, newerVote);
      expect(messageManager.messageCache.votes[voteKey]).toEqual(newerVote);

      // Attempt to update with older vote
      const evenOlderVote: SDSEnhancedMessage = {
        type: MessageType.VOTE as any,
        id: 'vote-0',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now() + 1000, // newer wall clock time
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 3,
          causalHistory: [],
        },
      };

      MessageManager.prototype.updateCache.call(messageManager, evenOlderVote);
      // Should still have the newer vote
      expect(messageManager.messageCache.votes[voteKey]).toEqual(newerVote);
    });

    it('should handle votes without SDS alongside votes with SDS', () => {
      const voteKey = 'post-1:0x123';

      // Vote without SDS
      const plainVote = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: 1000,
        author: '0x123',
      };

      MessageManager.prototype.updateCache.call(messageManager, plainVote);
      expect(messageManager.messageCache.votes[voteKey]).toEqual(plainVote);

      // Vote with SDS but older timestamp
      const sdsVote: SDSEnhancedMessage = {
        type: MessageType.VOTE as any,
        id: 'vote-2',
        targetId: 'post-1',
        value: -1,
        timestamp: 500, // older
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 1,
          causalHistory: [],
        },
      };

      // Since existing vote has no SDS, it falls back to timestamp comparison
      MessageManager.prototype.updateCache.call(messageManager, sdsVote);
      // Should keep the plain vote as it has newer timestamp
      expect(messageManager.messageCache.votes[voteKey]).toEqual(plainVote);
    });
  });

  describe('backward compatibility', () => {
    it('should handle all message types without SDS', () => {
      const messages = [
        {
          type: MessageType.CELL,
          id: 'cell-1',
          name: 'general',
          description: 'General discussion',
          icon: '🏠',
          timestamp: Date.now(),
          author: '0x123',
        },
        {
          type: MessageType.POST,
          id: 'post-1',
          cellId: 'general',
          title: 'Test Post',
          content: 'Test content',
          timestamp: Date.now(),
          author: '0x123',
        },
        {
          type: MessageType.COMMENT,
          id: 'comment-1',
          postId: 'post-1',
          content: 'Test comment',
          timestamp: Date.now(),
          author: '0x456',
        },
        {
          type: MessageType.VOTE,
          id: 'vote-1',
          targetId: 'post-1',
          value: 1,
          timestamp: Date.now(),
          author: '0x789',
        },
        {
          type: MessageType.MODERATE,
          id: 'mod-1',
          targetId: 'post-1',
          action: 'hide',
          cellId: 'general',
          timestamp: Date.now(),
          author: '0x123',
        },
      ];

      messages.forEach(message => {
        MessageManager.prototype.updateCache.call(messageManager, message);
      });

      // Verify all messages are cached correctly
      expect(messageManager.messageCache.cells['cell-1']).toBeDefined();
      expect(messageManager.messageCache.posts['post-1']).toBeDefined();
      expect(messageManager.messageCache.comments['comment-1']).toBeDefined();
      expect(messageManager.messageCache.votes['post-1:0x789']).toBeDefined();
      expect(messageManager.messageCache.moderations['post-1']).toBeDefined();
    });
  });
});