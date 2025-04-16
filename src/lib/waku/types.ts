/**
 * Message types for Waku communication
 */
export enum MessageType {
  CELL = 'cell',
  POST = 'post',
  COMMENT = 'comment',
  VOTE = 'vote'
}

/**
 * Base interface for all message types
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  author: string;
}

/**
 * Represents a cell message
 */
export interface CellMessage extends BaseMessage {
  type: MessageType.CELL;
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Represents a post message
 */
export interface PostMessage extends BaseMessage {
  type: MessageType.POST;
  id: string;
  cellId: string;
  title: string;
  content: string;
}

/**
 * Represents a comment message
 */
export interface CommentMessage extends BaseMessage {
  type: MessageType.COMMENT;
  id: string;
  postId: string;
  content: string;
}

/**
 * Represents a vote message
 */
export interface VoteMessage extends BaseMessage {
  type: MessageType.VOTE;
  id: string;
  targetId: string; // ID of the post or comment being voted on
  value: 1 | -1; 
}

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