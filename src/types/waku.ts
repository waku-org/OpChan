/**
 * Message types for Waku communication
 */
export enum MessageType {
  CELL = 'cell',
  POST = 'post',
  COMMENT = 'comment',
  VOTE = 'vote',
  MODERATE = 'moderate',
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
}

/**
 * Union types for message handling
 */
export type UnsignedMessage =
  | UnsignedCellMessage
  | UnsignedPostMessage
  | UnsignedCommentMessage
  | UnsignedVoteMessage
  | UnsignedModerateMessage;

export type SignedMessage =
  | CellMessage
  | PostMessage
  | CommentMessage
  | VoteMessage
  | ModerateMessage;

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
