import { EDisplayPreference, EVerificationStatus, IdentityProvider } from './identity';
import { DelegationProof } from '@/lib/delegation/types';

/**
 * Message types for Waku communication
 */
export enum MessageType {
  CELL = 'cell',
  POST = 'post',
  COMMENT = 'comment',
  VOTE = 'vote',
  MODERATE = 'moderate',
  USER_PROFILE_UPDATE = 'user_profile_update',
}

/**
 * Moderation action types
 */
export enum EModerationAction {
  MODERATE = 'moderate',
  UNMODERATE = 'unmoderate',
}

/**
 * Base interface for unsigned messages (before signing)
 */
export interface UnsignedBaseMessage {
  id: string;
  type: MessageType;
  timestamp: number; // Unix timestamp in milliseconds
  author: string;
}

/**
 * Base interface for all signed message types
 */
export interface BaseMessage extends UnsignedBaseMessage {
  signature: string; // Message signature for verification
  browserPubKey: string; // Public key that signed the message
  delegationProof: DelegationProof; // Cryptographic proof that browser key was authorized
}

/**
 * Unsigned message types (for creation, before signing)
 */
export interface UnsignedCellMessage extends UnsignedBaseMessage {
  type: MessageType.CELL;
  name: string;
  description: string;
  icon?: string;
}

export interface UnsignedPostMessage extends UnsignedBaseMessage {
  type: MessageType.POST;
  cellId: string;
  title: string;
  content: string;
}

export interface UnsignedCommentMessage extends UnsignedBaseMessage {
  type: MessageType.COMMENT;
  postId: string;
  content: string;
}

export interface UnsignedVoteMessage extends UnsignedBaseMessage {
  type: MessageType.VOTE;
  targetId: string; // ID of the post or comment being voted on
  value: 1 | -1;
}

export interface UnsignedModerateMessage extends UnsignedBaseMessage {
  type: MessageType.MODERATE;
  cellId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string; // postId, commentId, or user address (for user moderation)
  reason?: string;
  action: EModerationAction;
}

export interface UnsignedUserProfileUpdateMessage extends UnsignedBaseMessage {
  type: MessageType.USER_PROFILE_UPDATE;
  callSign?: string;
  displayPreference: EDisplayPreference;
}

/**
 * Signed message types (after signature is added)
 */
export interface CellMessage extends BaseMessage {
  type: MessageType.CELL;
  name: string;
  description: string;
  icon?: string;
}

export interface PostMessage extends BaseMessage {
  type: MessageType.POST;
  cellId: string;
  title: string;
  content: string;
}

export interface CommentMessage extends BaseMessage {
  type: MessageType.COMMENT;
  postId: string;
  content: string;
}

export interface VoteMessage extends BaseMessage {
  type: MessageType.VOTE;
  targetId: string; // ID of the post or comment being voted on
  value: 1 | -1;
}

export interface ModerateMessage extends BaseMessage {
  type: MessageType.MODERATE;
  cellId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string; // postId, commentId, or user address (for user moderation)
  reason?: string;
  action: EModerationAction;
}

export interface UserProfileUpdateMessage extends BaseMessage {
  type: MessageType.USER_PROFILE_UPDATE;
  callSign?: string;
  displayPreference: EDisplayPreference;
}

/**
 * Union types for message handling
 */
export type UnsignedMessage =
  | UnsignedCellMessage
  | UnsignedPostMessage
  | UnsignedCommentMessage
  | UnsignedVoteMessage
  | UnsignedModerateMessage
  | UnsignedUserProfileUpdateMessage;

export type SignedMessage =
  | CellMessage
  | PostMessage
  | CommentMessage
  | VoteMessage
  | ModerateMessage
  | UserProfileUpdateMessage;

/**
 * Cache objects for storing messages
 */
export interface CellCache {
  [cellId: string]: CellMessage;
}

export interface PostCache {
  [postId: string]: PostMessage;
}

export interface CommentCache {
  [commentId: string]: CommentMessage;
}

export interface VoteCache {
  [key: string]: VoteMessage; // key = targetId + authorAddress
}

export interface UserIdentityCache {
  [address: string]: {
    ensName?: string;
    ordinalDetails?: {
      ordinalId: string;
      ordinalDetails: string;
    };
    callSign?: string;
    displayPreference: EDisplayPreference;
    lastUpdated: number;
    verificationStatus: EVerificationStatus;
    identityProviders?: IdentityProvider[];
  };
}
