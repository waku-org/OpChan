import { MinimalSDSWrapper } from '../minimal-sds';
import { OpchanMessage } from '@/types';
import { SDSEnhancedMessage } from '../types';
import { MessageType } from '../../types';

describe('MinimalSDSWrapper', () => {
  let sds: MinimalSDSWrapper;

  beforeEach(() => {
    sds = new MinimalSDSWrapper();
  });

  describe('enhanceMessage', () => {
    it('should not enhance non-vote messages', () => {
      const postMessage: OpchanMessage = {
        type: MessageType.POST,
        id: 'post-1',
        cellId: 'general',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        author: '0x123',
      };

      const enhanced = sds.enhanceMessage(postMessage);
      
      expect(enhanced).toEqual(postMessage);
      expect('sds' in enhanced).toBe(false);
    });

    it('should enhance vote messages with SDS metadata', () => {
      const voteMessage: OpchanMessage = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now(),
        author: '0x123',
      };

      const enhanced = sds.enhanceMessage(voteMessage);
      
      expect('sds' in enhanced).toBe(true);
      expect(enhanced.sds).toBeDefined();
      expect(enhanced.sds?.channelId).toBe('opchan:votes:all');
      expect(enhanced.sds?.lamportTimestamp).toBe(1);
      expect(enhanced.sds?.causalHistory).toEqual([]);
    });

    it('should increment Lamport timestamp for each vote', () => {
      const vote1: OpchanMessage = {
        type: MessageType.VOTE,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now(),
        author: '0x123',
      };

      const vote2: OpchanMessage = {
        type: MessageType.VOTE,
        id: 'vote-2',
        targetId: 'post-2',
        value: -1,
        timestamp: Date.now() + 1000,
        author: '0x123',
      };

      const enhanced1 = sds.enhanceMessage(vote1);
      const enhanced2 = sds.enhanceMessage(vote2);
      
      expect(enhanced1.sds?.lamportTimestamp).toBe(1);
      expect(enhanced2.sds?.lamportTimestamp).toBe(2);
    });

    it('should maintain causal history', () => {
      const votes = Array.from({ length: 5 }, (_, i) => ({
        type: MessageType.VOTE as const,
        id: `vote-${i}`,
        targetId: 'post-1',
        value: i % 2 === 0 ? 1 : -1,
        timestamp: Date.now() + i * 1000,
        author: '0x123',
      }));

      const enhancedVotes = votes.map(vote => sds.enhanceMessage(vote));

      // First vote has empty history
      expect(enhancedVotes[0].sds?.causalHistory).toEqual([]);
      
      // Second vote has first vote in history
      expect(enhancedVotes[1].sds?.causalHistory).toEqual(['vote-0']);
      
      // Fifth vote has last 3 votes in history
      expect(enhancedVotes[4].sds?.causalHistory).toEqual(['vote-1', 'vote-2', 'vote-3']);
    });
  });

  describe('processIncomingMessage', () => {
    it('should ignore non-vote messages', () => {
      const postMessage: OpchanMessage = {
        type: MessageType.POST,
        id: 'post-1',
        cellId: 'general',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        author: '0x123',
      };

      // Should not throw
      expect(() => sds.processIncomingMessage(postMessage as SDSEnhancedMessage)).not.toThrow();
    });

    it('should update Lamport timestamp from incoming message', () => {
      const incomingVote = {
        type: MessageType.VOTE as const,
        id: 'vote-remote',
        targetId: 'post-1',
        value: 1,
        timestamp: Date.now(),
        author: '0x456',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 10,
          causalHistory: ['vote-a', 'vote-b'],
        },
      };

      sds.processIncomingMessage(incomingVote);

      // Next local message should have timestamp > 10
      const localVote: OpchanMessage = {
        type: MessageType.VOTE,
        id: 'vote-local',
        targetId: 'post-2',
        value: 1,
        timestamp: Date.now(),
        author: '0x123',
      };

      const enhanced = sds.enhanceMessage(localVote);
      expect(enhanced.sds?.lamportTimestamp).toBe(12); // max(0, 10) + 1 + 1
    });
  });

  describe('isCausallyNewer', () => {
    it('should use timestamp for messages without SDS metadata', () => {
      const older = {
        type: MessageType.VOTE as const,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: 1000,
        author: '0x123',
      };

      const newer = {
        type: MessageType.VOTE as const,
        id: 'vote-2',
        targetId: 'post-1',
        value: -1,
        timestamp: 2000,
        author: '0x123',
      };

      expect(sds.isCausallyNewer(newer as SDSEnhancedMessage, older as SDSEnhancedMessage)).toBe(true);
      expect(sds.isCausallyNewer(older as SDSEnhancedMessage, newer as SDSEnhancedMessage)).toBe(false);
    });

    it('should use Lamport timestamp for messages with SDS metadata', () => {
      const older = {
        type: MessageType.VOTE as const,
        id: 'vote-1',
        targetId: 'post-1',
        value: 1,
        timestamp: 2000, // newer wall clock time
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 5,
          causalHistory: [],
        },
      };

      const newer = {
        type: MessageType.VOTE as const,
        id: 'vote-2',
        targetId: 'post-1',
        value: -1,
        timestamp: 1000, // older wall clock time
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 10,
          causalHistory: ['vote-1'],
        },
      };

      // Despite older wall clock time, newer has higher Lamport timestamp
      expect(sds.isCausallyNewer(newer, older)).toBe(true);
      expect(sds.isCausallyNewer(older, newer)).toBe(false);
    });

    it('should use message ID as tiebreaker for equal Lamport timestamps', () => {
      const messageA = {
        type: MessageType.VOTE as const,
        id: 'vote-aaa',
        targetId: 'post-1',
        value: 1,
        timestamp: 1000,
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 5,
          causalHistory: [],
        },
      };

      const messageB = {
        type: MessageType.VOTE as const,
        id: 'vote-bbb',
        targetId: 'post-1',
        value: -1,
        timestamp: 1000,
        author: '0x123',
        sds: {
          channelId: 'opchan:votes:all',
          lamportTimestamp: 5,
          causalHistory: [],
        },
      };

      // 'vote-bbb' > 'vote-aaa' lexicographically
      expect(sds.isCausallyNewer(messageB, messageA)).toBe(true);
      expect(sds.isCausallyNewer(messageA, messageB)).toBe(false);
    });
  });
});