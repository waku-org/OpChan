import { IDecodedMessage } from '@waku/sdk';
import { Cell, Post, Comment } from '@/types';
import { CellMessage, CommentMessage, MessageType,  PostMessage } from './types';
import { OpchanMessage } from '@/types';
// Utility functions for converting between message types and application models
export function cellToMessage(cell: Cell, sender: string): CellMessage {
  return {
    type: MessageType.CELL,
    timestamp: Date.now(),
    author: sender,
    id: cell.id,
    name: cell.name,
    description: cell.description,
    icon: cell.icon
  };
}

export function messageToCell(message: CellMessage): Cell {
  return {
    id: message.id,
    name: message.name,
    description: message.description,
    icon: message.icon
  };
}

export function postToMessage(post: Post, sender: string): PostMessage {
  return {
    type: MessageType.POST,
    timestamp: Date.now(),
    author: sender,
    id: post.id,
    title: post.title,
    cellId: post.cellId,
    content: post.content
  };
}

export function messageToPost(message: PostMessage): Post {
  return {
    id: message.id,
    cellId: message.cellId,
    authorAddress: message.author,
    content: message.content,
    timestamp: message.timestamp,
    title: message.title,
    upvotes: [],
    downvotes: []
  };
}

export function commentToMessage(comment: Comment, sender: string): CommentMessage {
  return {
    type: MessageType.COMMENT,
    timestamp: Date.now(),
    author: sender,
    id: comment.id,
    postId: comment.postId,
    content: comment.content
  };
}

export function messageToComment(message: CommentMessage): Comment {
  return {
    id: message.id,
    postId: message.postId,
    authorAddress: message.author,
    content: message.content,
    timestamp: message.timestamp,
    upvotes: [],
    downvotes: []
  };
}

// Parse message from decoded waku message
export function parseMessage(decodedMessage: IDecodedMessage): OpchanMessage | null {
  try {
    if (!decodedMessage.payload) return null;
    
    const messageString = new TextDecoder().decode(decodedMessage.payload);
    const message = JSON.parse(messageString) as OpchanMessage;
    
    // Validate message has required fields
    if (!message.type || !message.timestamp || !message.author) {
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
export function serializeMessage(message: OpchanMessage): Uint8Array {
  const messageString = JSON.stringify(message);
  return new TextEncoder().encode(messageString);
} 