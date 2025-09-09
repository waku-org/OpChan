import { CellMessage, CommentMessage, PostMessage, VoteMessage, ModerateMessage, UserProfileUpdateMessage } from './waku';
import { EVerificationStatus } from './identity';
import { DelegationProof } from '../delegation/types';
/**
 * Union type of all message types
 * All messages MUST have valid signature and browserPubKey for authenticity
 */
export type OpchanMessage = (CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage | UserProfileUpdateMessage) & SignedMessage;
/**
 * Partial message type for validation
 */
export interface PartialMessage {
    type?: string;
    author?: string;
    timestamp?: number;
    signature?: string;
    browserPubKey?: string;
    [key: string]: unknown;
}
/**
 * Relevance score calculation details
 */
export interface RelevanceScoreDetails {
    baseScore: number;
    engagementScore: number;
    authorVerificationBonus: number;
    verifiedUpvoteBonus: number;
    verifiedCommenterBonus: number;
    timeDecayMultiplier: number;
    moderationPenalty: number;
    finalScore: number;
    isVerified: boolean;
    upvotes: number;
    comments: number;
    verifiedUpvotes: number;
    verifiedCommenters: number;
    daysOld: number;
    isModerated: boolean;
}
/**
 * Extended Cell with forum-specific fields
 * Extends the base CellMessage with UI and business logic properties
 */
export interface Cell extends CellMessage {
    relevanceScore?: number;
    activeMemberCount?: number;
    recentActivity?: number;
    postCount?: number;
    relevanceDetails?: RelevanceScoreDetails;
}
/**
 * Extended Post with forum-specific fields
 * Extends the base PostMessage with UI and business logic properties
 */
export interface Post extends PostMessage {
    authorAddress: string;
    upvotes: VoteMessage[];
    downvotes: VoteMessage[];
    moderated?: boolean;
    moderatedBy?: string;
    moderationReason?: string;
    moderationTimestamp?: number;
    relevanceScore?: number;
    verifiedUpvotes?: number;
    verifiedCommenters?: string[];
    relevanceDetails?: RelevanceScoreDetails;
    voteScore?: number;
}
/**
 * Extended Comment with forum-specific fields
 * Extends the base CommentMessage with UI and business logic properties
 */
export interface Comment extends CommentMessage {
    authorAddress: string;
    upvotes: VoteMessage[];
    downvotes: VoteMessage[];
    moderated?: boolean;
    moderatedBy?: string;
    moderationReason?: string;
    moderationTimestamp?: number;
    relevanceScore?: number;
    relevanceDetails?: RelevanceScoreDetails;
    voteScore?: number;
}
/**
 * Extended message types for verification
 * These fields are now REQUIRED for all valid messages
 */
export interface SignedMessage {
    signature: string;
    browserPubKey: string;
    delegationProof: DelegationProof;
}
/**
 * User verification status mapping
 */
export interface UserVerificationStatus {
    [address: string]: {
        isVerified: boolean;
        hasENS: boolean;
        hasOrdinal: boolean;
        ensName?: string;
        verificationStatus?: EVerificationStatus;
    };
}
/**
 * Bookmark types for posts and comments
 */
export declare enum BookmarkType {
    POST = "post",
    COMMENT = "comment"
}
/**
 * Bookmark data structure
 */
export interface Bookmark {
    id: string;
    type: BookmarkType;
    targetId: string;
    userId: string;
    createdAt: number;
    title?: string;
    author?: string;
    cellId?: string;
    postId?: string;
}
/**
 * Bookmark cache for in-memory storage
 */
export interface BookmarkCache {
    [bookmarkId: string]: Bookmark;
}
//# sourceMappingURL=forum.d.ts.map