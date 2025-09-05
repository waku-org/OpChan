import {
  Post,
  Comment,
  Cell,
  RelevanceScoreDetails,
  UserVerificationStatus,
} from '@/types/forum';
import { EVerificationStatus, User } from '@/types/identity';
import { VoteMessage } from '@/types/waku';

export class RelevanceCalculator {
  private static readonly BASE_SCORES = {
    POST: 10,
    COMMENT: 5,
    CELL: 15,
  };

  private static readonly ENGAGEMENT_SCORES = {
    UPVOTE: 1,
    COMMENT: 0.5,
  };

  private static readonly VERIFICATION_BONUS = 1.25; // 25% increase for ENS/Ordinal owners
  private static readonly BASIC_VERIFICATION_BONUS = 1.1; // 10% increase for basic verified users
  private static readonly VERIFIED_UPVOTE_BONUS = 0.1;
  private static readonly VERIFIED_COMMENTER_BONUS = 0.05;

  private static readonly DECAY_RATE = 0.1; // λ = 0.1
  private static readonly MODERATION_PENALTY = 0.5; // 50% reduction

  /**
   * Calculate relevance score for a post
   */
  calculatePostScore(
    post: Post,
    votes: VoteMessage[],
    comments: Comment[],
    userVerificationStatus: UserVerificationStatus
  ): { score: number; details: RelevanceScoreDetails } {
    let score = this.applyBaseScore('POST');
    const baseScore = score;

    const upvotes = votes.filter(vote => vote.value === 1);
    const engagementScore = this.applyEngagementScore(upvotes, comments);
    score += engagementScore;

    const { bonus: authorVerificationBonus, isVerified } =
      this.applyAuthorVerificationBonus(
        score,
        post.authorAddress,
        userVerificationStatus
      );
    score += authorVerificationBonus;

    const { bonus: verifiedUpvoteBonus, verifiedUpvotes } =
      this.applyVerifiedUpvoteBonus(upvotes, userVerificationStatus);
    score += verifiedUpvoteBonus;

    const { bonus: verifiedCommenterBonus, verifiedCommenters } =
      this.applyVerifiedCommenterBonus(comments, userVerificationStatus);
    score += verifiedCommenterBonus;

    const {
      decayedScore,
      multiplier: timeDecayMultiplier,
      daysOld,
    } = this.applyTimeDecay(score, post.timestamp);
    score = decayedScore;

    const { penalizedScore, penalty: moderationPenalty } =
      this.applyModerationPenalty(score, post.moderated || false);
    score = penalizedScore;

    const finalScore = Math.max(0, score); // Ensure non-negative score

    return {
      score: finalScore,
      details: {
        baseScore,
        engagementScore,
        authorVerificationBonus,
        verifiedUpvoteBonus,
        verifiedCommenterBonus,
        timeDecayMultiplier,
        moderationPenalty,
        finalScore,
        isVerified,
        upvotes: upvotes.length,
        comments: comments.length,
        verifiedUpvotes,
        verifiedCommenters,
        daysOld,
        isModerated: post.moderated || false,
      },
    };
  }

  /**
   * Calculate relevance score for a comment
   */
  calculateCommentScore(
    comment: Comment,
    votes: VoteMessage[],
    userVerificationStatus: UserVerificationStatus
  ): { score: number; details: RelevanceScoreDetails } {
    // Apply base score
    let score = this.applyBaseScore('COMMENT');
    const baseScore = score;

    const upvotes = votes.filter(vote => vote.value === 1);
    const engagementScore = this.applyEngagementScore(upvotes, []);
    score += engagementScore;

    const { bonus: authorVerificationBonus, isVerified } =
      this.applyAuthorVerificationBonus(
        score,
        comment.authorAddress,
        userVerificationStatus
      );
    score += authorVerificationBonus;

    const { bonus: verifiedUpvoteBonus, verifiedUpvotes } =
      this.applyVerifiedUpvoteBonus(upvotes, userVerificationStatus);
    score += verifiedUpvoteBonus;

    const {
      decayedScore,
      multiplier: timeDecayMultiplier,
      daysOld,
    } = this.applyTimeDecay(score, comment.timestamp);
    score = decayedScore;

    const { penalizedScore, penalty: moderationPenalty } =
      this.applyModerationPenalty(score, comment.moderated || false);
    score = penalizedScore;

    const finalScore = Math.max(0, score); // Ensure non-negative score

    return {
      score: finalScore,
      details: {
        baseScore,
        engagementScore,
        authorVerificationBonus,
        verifiedUpvoteBonus,
        verifiedCommenterBonus: 0, // Comments don't have commenters
        timeDecayMultiplier,
        moderationPenalty,
        finalScore,
        isVerified,
        upvotes: upvotes.length,
        comments: 0, // Comments don't have comments
        verifiedUpvotes,
        verifiedCommenters: 0,
        daysOld,
        isModerated: comment.moderated || false,
      },
    };
  }

  /**
   * Calculate relevance score for a cell
   */
  calculateCellScore(
    cell: Cell,
    posts: Post[]
  ): { score: number; details: RelevanceScoreDetails } {
    // Apply base score
    let score = this.applyBaseScore('CELL');
    const baseScore = score;

    // Calculate cell-specific engagement
    const cellPosts = posts.filter(post => post.cellId === cell.id);
    const totalUpvotes = cellPosts.reduce((sum, post) => {
      return sum + (post.upvotes?.length || 0);
    }, 0);

    const activityScore =
      cellPosts.length * RelevanceCalculator.ENGAGEMENT_SCORES.COMMENT;
    const engagementBonus = totalUpvotes * 0.1; // Small bonus for cell activity
    const engagementScore = activityScore + engagementBonus;
    score += engagementScore;

    const mostRecentPost = cellPosts.reduce(
      (latest, post) => {
        return post.timestamp > latest.timestamp ? post : latest;
      },
      { timestamp: Date.now() }
    );
    const {
      decayedScore,
      multiplier: timeDecayMultiplier,
      daysOld,
    } = this.applyTimeDecay(score, mostRecentPost.timestamp);
    score = decayedScore;

    const finalScore = Math.max(0, score); // Ensure non-negative score

    return {
      score: finalScore,
      details: {
        baseScore,
        engagementScore,
        authorVerificationBonus: 0, // Cells don't have authors in the same way
        verifiedUpvoteBonus: 0,
        verifiedCommenterBonus: 0,
        timeDecayMultiplier,
        moderationPenalty: 1, // Cells aren't moderated
        finalScore,
        isVerified: false, // Cells don't have verification status
        upvotes: totalUpvotes,
        comments: cellPosts.length,
        verifiedUpvotes: 0,
        verifiedCommenters: 0,
        daysOld,
        isModerated: false,
      },
    };
  }

  /**
   * Check if a user is verified (has ENS or ordinal ownership, or basic verification)
   */
  isUserVerified(user: User): boolean {
    return !!(
      user.ensDetails ||
      user.ordinalDetails ||
      user.verificationStatus === EVerificationStatus.WALLET_CONNECTED
    );
  }

  /**
   * Build user verification status map from users array
   */
  buildUserVerificationStatus(users: User[]): UserVerificationStatus {
    const status: UserVerificationStatus = {};

    users.forEach(user => {
      status[user.address] = {
        isVerified: this.isUserVerified(user),
        hasENS: !!user.ensDetails,
        hasOrdinal: !!user.ordinalDetails,
        ensName: user.ensDetails?.ensName,
        verificationStatus: user.verificationStatus,
      };
    });

    return status;
  }

  /**
   * Apply base score to the current score
   */
  private applyBaseScore(type: 'POST' | 'COMMENT' | 'CELL'): number {
    return RelevanceCalculator.BASE_SCORES[type];
  }

  /**
   * Apply engagement score based on upvotes and comments
   */
  private applyEngagementScore(
    upvotes: VoteMessage[],
    comments: Comment[] = []
  ): number {
    const upvoteScore =
      upvotes.length * RelevanceCalculator.ENGAGEMENT_SCORES.UPVOTE;
    const commentScore =
      comments.length * RelevanceCalculator.ENGAGEMENT_SCORES.COMMENT;
    return upvoteScore + commentScore;
  }

  /**
   * Apply verification bonus for verified authors
   */
  private applyAuthorVerificationBonus(
    score: number,
    authorAddress: string,
    userVerificationStatus: UserVerificationStatus
  ): { bonus: number; isVerified: boolean } {
    const authorStatus = userVerificationStatus[authorAddress];
    const isVerified = authorStatus?.isVerified || false;

    if (!isVerified) {
      return { bonus: 0, isVerified: false };
    }

    // Apply different bonuses based on verification level
    let bonus = 0;
    if (
      authorStatus?.verificationStatus ===
      EVerificationStatus.ENS_ORDINAL_VERIFIED
    ) {
      // Full bonus for ENS/Ordinal owners
      bonus = score * (RelevanceCalculator.VERIFICATION_BONUS - 1);
    } else if (
      authorStatus?.verificationStatus === EVerificationStatus.WALLET_CONNECTED
    ) {
      // Lower bonus for basic verified users
      bonus = score * (RelevanceCalculator.BASIC_VERIFICATION_BONUS - 1);
    }

    return { bonus, isVerified: true };
  }

  /**
   * Apply verified upvote bonus
   */
  private applyVerifiedUpvoteBonus(
    upvotes: VoteMessage[],
    userVerificationStatus: UserVerificationStatus
  ): { bonus: number; verifiedUpvotes: number } {
    const verifiedUpvotes = upvotes.filter(vote => {
      const voterStatus = userVerificationStatus[vote.author];
      return voterStatus?.isVerified;
    });

    const bonus =
      verifiedUpvotes.length * RelevanceCalculator.VERIFIED_UPVOTE_BONUS;
    return { bonus, verifiedUpvotes: verifiedUpvotes.length };
  }

  /**
   * Apply verified commenter bonus
   */
  private applyVerifiedCommenterBonus(
    comments: Comment[],
    userVerificationStatus: UserVerificationStatus
  ): { bonus: number; verifiedCommenters: number } {
    const verifiedCommenters = new Set<string>();

    comments.forEach(comment => {
      const commenterStatus = userVerificationStatus[comment.authorAddress];
      if (commenterStatus?.isVerified) {
        verifiedCommenters.add(comment.authorAddress);
      }
    });

    const bonus =
      verifiedCommenters.size * RelevanceCalculator.VERIFIED_COMMENTER_BONUS;
    return { bonus, verifiedCommenters: verifiedCommenters.size };
  }

  /**
   * Apply time decay to a score
   */
  private applyTimeDecay(
    score: number,
    timestamp: number
  ): {
    decayedScore: number;
    multiplier: number;
    daysOld: number;
  } {
    const daysOld = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    const multiplier = Math.exp(-RelevanceCalculator.DECAY_RATE * daysOld);
    const decayedScore = score * multiplier;

    return { decayedScore, multiplier, daysOld };
  }

  /**
   * Apply moderation penalty
   */
  private applyModerationPenalty(
    score: number,
    isModerated: boolean
  ): { penalizedScore: number; penalty: number } {
    if (isModerated) {
      const penalizedScore = score * RelevanceCalculator.MODERATION_PENALTY;
      return {
        penalizedScore,
        penalty: RelevanceCalculator.MODERATION_PENALTY,
      };
    }

    return { penalizedScore: score, penalty: 1 };
  }
}
