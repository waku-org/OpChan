import { RelevanceCalculator } from '../RelevanceCalculator';
import { Post, Comment, UserVerificationStatus } from '../../types/forum';
import {
  User,
  EVerificationStatus,
  EDisplayPreference,
} from '../../types/identity';
import { VoteMessage, MessageType } from '../../types/waku';
import { DelegationProof } from '../delegation/types';
import { expect, describe, beforeEach, it } from 'vitest';

// Mock delegation proof for tests
const mockDelegationProof: DelegationProof = {
  authMessage: 'I, test-address, authorize browser key test-key until 20/11/2286, 11:16:39 pm (nonce: test-nonce)',
  walletSignature: 'mock-signature',
  expiryTimestamp: 9999999999999,
  walletAddress: 'test-address',
  walletType: 'ethereum',
};

describe('RelevanceCalculator', () => {
  let calculator: RelevanceCalculator;
  let mockUserVerificationStatus: UserVerificationStatus;

  beforeEach(() => {
    calculator = new RelevanceCalculator();
    mockUserVerificationStatus = {
      user1: { isVerified: true, hasENS: true, hasOrdinal: false },
      user2: { isVerified: false, hasENS: false, hasOrdinal: false },
      user3: { isVerified: true, hasENS: false, hasOrdinal: true },
    };
  });

  describe('calculatePostScore', () => {
    it('should calculate base score for a new post', () => {
      const post: Post = {
        id: '1',
        type: MessageType.POST,
        author: 'user2',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const result = calculator.calculatePostScore(
        post,
        [],
        [],
        mockUserVerificationStatus
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.details.baseScore).toBe(10);
      expect(result.details.isVerified).toBe(false);
    });

    it('should apply verification bonus for verified author', () => {
      const post: Post = {
        id: '1',
        type: MessageType.POST,
        author: 'user1',
        cellId: 'cell1',
        authorAddress: 'user1',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const result = calculator.calculatePostScore(
        post,
        [],
        [],
        mockUserVerificationStatus
      );

      expect(result.details.isVerified).toBe(true);
      expect(result.details.authorVerificationBonus).toBeGreaterThan(0);
    });

    it('should correctly identify verified users with ENS ownership', () => {
      const verifiedUser: User = {
        address: 'user1',
        walletType: 'ethereum',
        verificationStatus: EVerificationStatus.ENS_ORDINAL_VERIFIED,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        ensDetails: {
          ensName: 'test.eth',
        },
        ordinalDetails: undefined,
        lastChecked: Date.now(),
      };

      const isVerified = calculator.isUserVerified(verifiedUser);
      expect(isVerified).toBe(true);
    });

    it('should correctly identify verified users with Ordinal ownership', () => {
      const verifiedUser: User = {
        address: 'user3',
        walletType: 'bitcoin',
        verificationStatus: EVerificationStatus.ENS_ORDINAL_VERIFIED,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        ordinalDetails: {
          ordinalId: '1',
          ordinalDetails: 'test',
        },
        lastChecked: Date.now(),
      };

      const isVerified = calculator.isUserVerified(verifiedUser);
      expect(isVerified).toBe(true);
    });

    it('should correctly identify unverified users', () => {
      const unverifiedUser: User = {
        address: 'user2',
        walletType: 'ethereum',
        verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        ensDetails: undefined,
        ordinalDetails: undefined,
        lastChecked: Date.now(),
      };

      const isVerified = calculator.isUserVerified(unverifiedUser);
      expect(isVerified).toBe(false);
    });

    it('should apply moderation penalty', () => {
      const post: Post = {
        id: '1',
        type: MessageType.POST,
        author: 'user2',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        moderated: true,
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const result = calculator.calculatePostScore(
        post,
        [],
        [],
        mockUserVerificationStatus
      );

      expect(result.details.isModerated).toBe(true);
      expect(result.details.moderationPenalty).toBe(0.5);
    });

    it('should calculate engagement bonuses', () => {
      const post: Post = {
        id: '1',
        type: MessageType.POST,
        author: 'user2',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Test Post',
        content: 'Test content',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const votes: VoteMessage[] = [
        {
          id: 'vote1',
          targetId: '1',
          value: 1,
          author: 'user1',
          timestamp: Date.now(),
          type: MessageType.VOTE,
          signature: 'test',
          browserPubKey: 'test',
          delegationProof: mockDelegationProof,
        },
        {
          id: 'vote2',
          targetId: '1',
          value: 1,
          author: 'user3',
          timestamp: Date.now(),
          type: MessageType.VOTE,
          signature: 'test',
          browserPubKey: 'test',
          delegationProof: mockDelegationProof,
        },
      ];

      const comments: Comment[] = [
        {
          id: 'comment1',
          postId: '1',
          authorAddress: 'user1',
          content: 'Test comment',
          timestamp: Date.now(),
          upvotes: [],
          downvotes: [],
          type: MessageType.COMMENT,
          author: 'user1',
          signature: 'test',
          browserPubKey: 'test',
          delegationProof: mockDelegationProof,
        },
      ];

      const result = calculator.calculatePostScore(
        post,
        votes,
        comments,
        mockUserVerificationStatus
      );

      expect(result.details.upvotes).toBe(2);
      expect(result.details.comments).toBe(1);
      expect(result.details.verifiedUpvotes).toBe(2);
      expect(result.details.verifiedCommenters).toBe(1);
    });
  });

  describe('timeDecay', () => {
    it('should apply time decay to older posts', () => {
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const recentPost: Post = {
        id: '1',
        cellId: 'cell1',
        authorAddress: 'user2',
        type: MessageType.POST,
        author: 'user2',
        title: 'Recent Post',
        content: 'Recent content',
        timestamp: now,
        upvotes: [],
        downvotes: [],
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const oldPost: Post = {
        id: '2',
        type: MessageType.POST,
        author: 'user2',
        cellId: 'cell1',
        authorAddress: 'user2',
        title: 'Old Post',
        content: 'Old content',
        timestamp: oneWeekAgo,
        upvotes: [],
        downvotes: [],
        signature: 'test',
        browserPubKey: 'test',
        delegationProof: mockDelegationProof,
      };

      const recentResult = calculator.calculatePostScore(
        recentPost,
        [],
        [],
        mockUserVerificationStatus
      );
      const oldResult = calculator.calculatePostScore(
        oldPost,
        [],
        [],
        mockUserVerificationStatus
      );

      expect(recentResult.score).toBeGreaterThan(oldResult.score);
    });
  });

  describe('buildUserVerificationStatus', () => {
    it('should correctly build verification status map from users array', () => {
      const users: User[] = [
        {
          address: 'user1',
          walletType: 'ethereum',
          verificationStatus: EVerificationStatus.ENS_ORDINAL_VERIFIED,
          displayPreference: EDisplayPreference.WALLET_ADDRESS,
          ensDetails: {
            ensName: 'test.eth',
          },
          ordinalDetails: undefined,
          lastChecked: Date.now(),
        },
        {
          address: 'user2',
          walletType: 'bitcoin',
          verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
          displayPreference: EDisplayPreference.WALLET_ADDRESS,
          ensDetails: undefined,
          ordinalDetails: undefined,
          lastChecked: Date.now(),
        },
      ];

      const status = calculator.buildUserVerificationStatus(users);

      expect(status['user1']?.isVerified).toBe(true);
      expect(status['user1']?.hasENS).toBe(true);
      expect(status['user1']?.hasOrdinal).toBe(false);

      expect(status['user2']?.isVerified).toBe(false);
      expect(status['user2']?.hasENS).toBe(false);
      expect(status['user2']?.hasOrdinal).toBe(false);
    });
  });
});
