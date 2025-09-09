import { Post, Comment, Cell, RelevanceScoreDetails, UserVerificationStatus } from '../types/forum';
import { User } from '../types/identity';
import { VoteMessage } from '../types/waku';
export declare class RelevanceCalculator {
    private static readonly BASE_SCORES;
    private static readonly ENGAGEMENT_SCORES;
    private static readonly VERIFICATION_BONUS;
    private static readonly BASIC_VERIFICATION_BONUS;
    private static readonly VERIFIED_UPVOTE_BONUS;
    private static readonly VERIFIED_COMMENTER_BONUS;
    private static readonly DECAY_RATE;
    private static readonly MODERATION_PENALTY;
    /**
     * Calculate relevance score for a post
     */
    calculatePostScore(post: Post, votes: VoteMessage[], comments: Comment[], userVerificationStatus: UserVerificationStatus): {
        score: number;
        details: RelevanceScoreDetails;
    };
    /**
     * Calculate relevance score for a comment
     */
    calculateCommentScore(comment: Comment, votes: VoteMessage[], userVerificationStatus: UserVerificationStatus): {
        score: number;
        details: RelevanceScoreDetails;
    };
    /**
     * Calculate relevance score for a cell
     */
    calculateCellScore(cell: Cell, posts: Post[]): {
        score: number;
        details: RelevanceScoreDetails;
    };
    /**
     * Check if a user is verified (has ENS or ordinal ownership, or basic verification)
     */
    isUserVerified(user: User): boolean;
    /**
     * Build user verification status map from users array
     */
    buildUserVerificationStatus(users: User[]): UserVerificationStatus;
    /**
     * Apply base score to the current score
     */
    private applyBaseScore;
    /**
     * Apply engagement score based on upvotes and comments
     */
    private applyEngagementScore;
    /**
     * Apply verification bonus for verified authors
     */
    private applyAuthorVerificationBonus;
    /**
     * Apply verified upvote bonus
     */
    private applyVerifiedUpvoteBonus;
    /**
     * Apply verified commenter bonus
     */
    private applyVerifiedCommenterBonus;
    /**
     * Apply time decay to a score
     */
    private applyTimeDecay;
    /**
     * Apply moderation penalty
     */
    private applyModerationPenalty;
}
//# sourceMappingURL=RelevanceCalculator.d.ts.map