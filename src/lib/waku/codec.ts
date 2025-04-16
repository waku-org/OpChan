import { MessageType } from './types';
import { OpchanMessage, CellMessage, PostMessage, CommentMessage, VoteMessage } from './types';

/**
 * Encode a message object into a Uint8Array for transmission
 */
export function encodeMessage(message: OpchanMessage): Uint8Array {
  // Convert the message to a JSON string
  const messageJson = JSON.stringify(message);
  
  // Convert the string to a Uint8Array
  return new TextEncoder().encode(messageJson);
}

/**
 * Decode a message from a Uint8Array based on its type
 */
export function decodeMessage(payload: Uint8Array, type?: MessageType): OpchanMessage {
  // Convert the Uint8Array to a string
  const messageJson = new TextDecoder().decode(payload);
  
  // Parse the JSON string to an object
  const message = JSON.parse(messageJson) as OpchanMessage;
  
  // Validate the message type if specified
  if (type && message.type !== type) {
    throw new Error(`Expected message of type ${type}, but got ${message.type}`);
  }
  
  // Return the decoded message
  return message;
}

/**
 * Type-specific decoders
 */
export function decodeCellMessage(payload: Uint8Array): CellMessage {
  return decodeMessage(payload, MessageType.CELL) as CellMessage;
}

export function decodePostMessage(payload: Uint8Array): PostMessage {
  return decodeMessage(payload, MessageType.POST) as PostMessage;
}

export function decodeCommentMessage(payload: Uint8Array): CommentMessage {
  return decodeMessage(payload, MessageType.COMMENT) as CommentMessage;
}

export function decodeVoteMessage(payload: Uint8Array): VoteMessage {
  return decodeMessage(payload, MessageType.VOTE) as VoteMessage;
} 