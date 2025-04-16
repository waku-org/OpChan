import { MessageType } from './constants';
import { DecodedMessage } from '@waku/sdk';
import { Cell, Post, Comment } from '@/types/forum';

// Base structure for all messages
export interface WakuMessageBase {
  messageType: MessageType;
  timestamp: number;
  sender: string; // Bitcoin address of sender
  signature?: string; // Signature to verify sender
}

// Message structures for different content types
export interface CellMessage extends WakuMessageBase {
  messageType: MessageType.CELL;
  cellId: string;
  name: string;
  description: string;
  icon: string;
}

export interface PostMessage extends WakuMessageBase {
  messageType: MessageType.POST;
  postId: string;
  cellId: string;
  content: string;
}

export interface CommentMessage extends WakuMessageBase {
  messageType: MessageType.COMMENT;
  commentId: string;
  postId: string;
  content: string;
}

export interface VoteMessage extends WakuMessageBase {
  messageType: MessageType.VOTE;
  targetId: string; // postId or commentId
  isUpvote: boolean;
}

// Type for all possible messages
export type WakuMessage = 
  | CellMessage 
  | PostMessage 
  | CommentMessage 
  | VoteMessage;

// Utility functions for converting between message types and application models
export function cellToMessage(cell: Cell, sender: string): CellMessage {
  return {
    messageType: MessageType.CELL,
    timestamp: Date.now(),
    sender,
    cellId: cell.id,
    name: cell.name,
    description: cell.description,
    icon: cell.icon
  };
}

export function messageToCell(message: CellMessage): Cell {
  return {
    id: message.cellId,
    name: message.name,
    description: message.description,
    icon: message.icon
  };
}

export function postToMessage(post: Post, sender: string): PostMessage {
  return {
    messageType: MessageType.POST,
    timestamp: Date.now(),
    sender,
    postId: post.id,
    cellId: post.cellId,
    content: post.content
  };
}

export function messageToPost(message: PostMessage): Post {
  return {
    id: message.postId,
    cellId: message.cellId,
    authorAddress: message.sender,
    content: message.content,
    timestamp: message.timestamp,
    upvotes: [],
    downvotes: []
  };
}

export function commentToMessage(comment: Comment, sender: string): CommentMessage {
  return {
    messageType: MessageType.COMMENT,
    timestamp: Date.now(),
    sender,
    commentId: comment.id,
    postId: comment.postId,
    content: comment.content
  };
}

export function messageToComment(message: CommentMessage): Comment {
  return {
    id: message.commentId,
    postId: message.postId,
    authorAddress: message.sender,
    content: message.content,
    timestamp: message.timestamp,
    upvotes: [],
    downvotes: []
  };
}

// Parse message from decoded waku message
export function parseMessage(decodedMessage: DecodedMessage): WakuMessage | null {
  try {
    if (!decodedMessage.payload) return null;
    
    const messageString = new TextDecoder().decode(decodedMessage.payload);
    const message = JSON.parse(messageString) as WakuMessage;
    
    // Validate message has required fields
    if (!message.messageType || !message.timestamp || !message.sender) {
      console.error('Invalid message format:', message);
      return null;
    }
    
    return message;
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
}

// Serialize message to payload bytes
export function serializeMessage(message: WakuMessage): Uint8Array {
  const messageString = JSON.stringify(message);
  return new TextEncoder().encode(messageString);
} 