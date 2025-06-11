import { MinimalSDSWrapper } from '../minimal-sds';
import { MessageType, VoteMessage, PostMessage, CommentMessage } from '@/lib/waku/types';

// Mock @waku/sdk
jest.mock('@waku/sdk', () => ({
  createEncoder: jest.fn().mockReturnValue({}),
  createDecoder: jest.fn().mockReturnValue({}),
}));

describe('SDS Non-Breaking Functionality', () => {
  let sds: MinimalSDSWrapper;

  beforeEach(() => {
    sds = new MinimalSDSWrapper();
  });

  describe('Non-vote messages remain unchanged', () => {
    it('should not modify post messages', () => {
      const post: PostMessage = {
        type: MessageType.POST,
        id: 'post-1',
        cellId: 'general',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        author: '0x123',
      };

      const enhanced = sds.enhanceMessage(post);
      
      // Should be exactly the same object
      expect(enhanced).toBe(post);
      expect('sds' in enhanced).toBe(false);
    });

    it('should not modify comment messages', () => {
      const comment: CommentMessage = {
        type: MessageType.COMMENT,
        id: 'comment-1',
        postId: 'post-1',
        content: 'Test comment',
        timestamp: Date.now(),
        author: '0x456',
      };

      const enhanced = sds.enhanceMessage(comment);
      
      expect(enhanced).toBe(comment);
      expect('sds' in enhanced).toBe(false);
    });
  });

  describe('Vote messages get SDS enhancement', () => {
    it('should add SDS metadata to votes without changing original fields', () => {
      const vote: VoteMessage = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: 1234567890,
        author: '0x789',
      };

      const enhanced = sds.enhanceMessage(vote);
      
      // Original fields unchanged
      expect(enhanced.type).toBe(MessageType.VOTE);
      if (enhanced.type === MessageType.VOTE) {
        expect(enhanced.id).toBe('vote-1');
        expect(enhanced.targetId).toBe('post-1');
        expect(enhanced.value).toBe(1);
        expect(enhanced.timestamp).toBe(1234567890);
        expect(enhanced.author).toBe('0x789');
        
        // SDS metadata added
        expect('sds' in enhanced).toBe(true);
        if ('sds' in enhanced && enhanced.sds) {
          expect(enhanced.sds).toBeDefined();
          expect(enhanced.sds.channelId).toBe('opchan:votes:all');
          expect(enhanced.sds.lamportTimestamp).toBeGreaterThan(0);
          expect(Array.isArray(enhanced.sds.causalHistory)).toBe(true);
        }
      }
    });
  });

  describe('Causal ordering preserves latest vote', () => {
    it('should correctly identify newer votes', () => {
      // Create two votes with SDS metadata
      const vote1: VoteMessage = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: 1000,
        author: '0x123',
      };

      const vote2: VoteMessage = {
        type: MessageType.VOTE,
        id: 'vote-2',
        targetId: 'post-1',
        value: -1,
        timestamp: 2000,
        author: '0x123',
      };

      const enhanced1 = sds.enhanceMessage(vote1);
      const enhanced2 = sds.enhanceMessage(vote2);

      // Second vote should have higher Lamport timestamp
      if (enhanced1.type === MessageType.VOTE && enhanced2.type === MessageType.VOTE && 
          'sds' in enhanced1 && enhanced1.sds && 'sds' in enhanced2 && enhanced2.sds) {
        expect(enhanced2.sds.lamportTimestamp).toBeGreaterThan(enhanced1.sds.lamportTimestamp);
        
        // Should identify vote2 as newer
        expect(sds.isCausallyNewer(enhanced2, enhanced1)).toBe(true);
        expect(sds.isCausallyNewer(enhanced1, enhanced2)).toBe(false);
      } else {
        fail('SDS metadata should be added to vote messages');
      }
    });
  });

  describe('Backward compatibility', () => {
    it('should handle votes without SDS metadata gracefully', () => {
      const plainVote: VoteMessage = {
        type: MessageType.VOTE,
        id: 'vote-plain',
        targetId: 'post-1',
        value: 1,
        timestamp: 1000,
        author: '0x123',
      };

      const sdsVote = {
        ...plainVote,
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 5,
          causalHistory: [],
        },
      } as VoteMessage & { sds: { channelId: string; lamportTimestamp: number; causalHistory: string[] } };

      // Should fall back to timestamp comparison
      expect(sds.isCausallyNewer(sdsVote, plainVote)).toBe(false); // same timestamp
      
      const newerPlainVote = { ...plainVote, timestamp: 2000 };
      expect(sds.isCausallyNewer(newerPlainVote, sdsVote)).toBe(true); // newer timestamp
    });
  });
});