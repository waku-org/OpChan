import { RelevanceCalculator } from '../relevance';
import { Post, Comment, User, UserVerificationStatus, EVerificationStatus } from '@/types/forum';
import { VoteMessage, MessageType } from '@/lib/waku/types';
import { expect, describe, beforeEach, it } from 'vitest';

describe('RelevanceCalculator', () => {
  let calculator: RelevanceCalculator;
  let mockUserVerificationStatus: UserVerificationStatus;

  beforeEach(() => {
    calculator = new RelevanceCalculator();
    mockUserVerificationStatus = {
      'user1': { isVerified: true, hasENS: true, hasOrdinal: false },
      'user2': { isVerified: false, hasENS: false, hasOrdinal: false },
      'user3': { isVerified: true, hasENS: false, hasOrdinal: true }
    };
  });

  describe('calculatePostScore', () => {
    it('should calculate base score for a new post', () => {
      const post: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'signature'
      };

      const result = calculator.calculatePostScore(post, [], [], mockUserVerificationStatus);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.details.baseScore).toBe(10);
      expect(result.details.isVerified).toBe(false);
    });

    it('should apply verification bonus for verified author', () => {
      const post: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user1',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'signature'
      };

      const result = calculator.calculatePostScore(post, [], [], mockUserVerificationStatus);
      
      expect(result.details.isVerified).toBe(true);
      expect(result.details.authorVerificationBonus).toBeGreaterThan(0);
    });

    it('should correctly identify verified users with ENS ownership', () => {
      const verifiedUser: User = {
        address: 'user1',
        walletType: 'ethereum',
        verificationStatus: EVerificationStatus.VERIFIED_OWNER,
        ensOwnership: true,
        ensName: 'test.eth',
        lastChecked: Date.now(),
        signature: 'signature'
      };

      const isVerified = calculator.isUserVerified(verifiedUser);
      expect(isVerified).toBe(true);
    });

    it('should correctly identify verified users with Ordinal ownership', () => {
      const verifiedUser: User = {
        address: 'user3',
        walletType: 'bitcoin',
        verificationStatus: EVerificationStatus.VERIFIED_OWNER,
        ordinalOwnership: true,
        lastChecked: Date.now(),
        signature: 'signature'
      };

      const isVerified = calculator.isUserVerified(verifiedUser);
      expect(isVerified).toBe(true);
    });

    it('should correctly identify unverified users', () => {
      const unverifiedUser: User = {
        address: 'user2',
        walletType: 'ethereum',
        verificationStatus: EVerificationStatus.UNVERIFIED,
        ensOwnership: false,
        lastChecked: Date.now(),
        signature: 'signature'
      };

      const isVerified = calculator.isUserVerified(unverifiedUser);
      expect(isVerified).toBe(false);
    });

    it('should apply moderation penalty', () => {
      const post: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        moderated: true,
        signature: 'signature'
      };

      const result = calculator.calculatePostScore(post, [], [], mockUserVerificationStatus);
      
      expect(result.details.isModerated).toBe(true);
      expect(result.details.moderationPenalty).toBe(0.5);
    });

    it('should calculate engagement bonuses', () => {
      const post: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'signature'
      };

      const votes: VoteMessage[] = [
        { id: 'vote1', targetId: '1', value: 1, author: 'user1', timestamp: Date.now(), type: MessageType.VOTE, signature: 'signature' },
        { id: 'vote2', targetId: '1', value: 1, author: 'user3', timestamp: Date.now(), type: MessageType.VOTE, signature: 'signature' }
      ];

      const comments: Comment[] = [
        { id: 'comment1', postId: '1', authorAddress: 'user1', content: 'Test comment', timestamp: Date.now(), upvotes: [], downvotes: [], signature: 'signature' }
      ];

      const result = calculator.calculatePostScore(post, votes, comments, mockUserVerificationStatus);
      
      expect(result.details.upvotes).toBe(2);
      expect(result.details.comments).toBe(1);
      expect(result.details.verifiedUpvotes).toBe(2);
      expect(result.details.verifiedCommenters).toBe(1);
    });
  });

  describe('timeDecay', () => {
    it('should apply time decay to older posts', () => {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      const recentPost: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Recent Post',
        content: 'Recent content',
        timestamp: now,
        upvotes: [],
        downvotes: [],
        signature: 'signature'
      };

      const oldPost: Post = {
        id: '2',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Old Post',
        content: 'Old content',
        timestamp: oneWeekAgo,
        upvotes: [],
        downvotes: [],
        signature: 'signature'
      };

      const recentResult = calculator.calculatePostScore(recentPost, [], [], mockUserVerificationStatus);
      const oldResult = calculator.calculatePostScore(oldPost, [], [], mockUserVerificationStatus);

      expect(recentResult.score).toBeGreaterThan(oldResult.score);
    });
  });

  describe('buildUserVerificationStatus', () => {
    it('should correctly build verification status map from users array', () => {
      const users: User[] = [
        {
          address: 'user1',
          walletType: 'ethereum',
          verificationStatus: EVerificationStatus.VERIFIED_OWNER,
          ensOwnership: true,
          ensName: 'test.eth',
              lastChecked: Date.now(),
          signature: 'signature'
        },
        {
          address: 'user2',
          walletType: 'bitcoin',
          verificationStatus: EVerificationStatus.UNVERIFIED,
          ordinalOwnership: false,
          lastChecked: Date.now(),
          signature: 'signature'
        }
      ];

      const status = calculator.buildUserVerificationStatus(users);
      
      expect(status['user1'].isVerified).toBe(true);
      expect(status['user1'].hasENS).toBe(true);
      expect(status['user1'].hasOrdinal).toBe(false);
      
      expect(status['user2'].isVerified).toBe(false);
      expect(status['user2'].hasENS).toBe(false);
      expect(status['user2'].hasOrdinal).toBe(false);
    });
  });
});
