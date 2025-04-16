import { createDecoder, createEncoder } from '@waku/sdk';
import { MessageType } from './types';
import {  CellMessage, PostMessage, CommentMessage, VoteMessage } from './types';
import { CONTENT_TOPICS } from './constants';
import { OpchanMessage } from '@/types';

export const encoders = {
    [MessageType.CELL]: createEncoder({
        contentTopic: CONTENT_TOPICS['cell'],
    }),
    [MessageType.POST]: createEncoder({
      contentTopic: CONTENT_TOPICS['post'], 
    }),
    [MessageType.COMMENT]: createEncoder({
      contentTopic: CONTENT_TOPICS['comment'],
    }),
    [MessageType.VOTE]: createEncoder({
      contentTopic: CONTENT_TOPICS['vote'],
    }),
}

export const decoders = {
    [MessageType.CELL]: createDecoder(CONTENT_TOPICS['cell']),
    [MessageType.POST]: createDecoder(CONTENT_TOPICS['post']),
    [MessageType.COMMENT]: createDecoder(CONTENT_TOPICS['comment']),
    [MessageType.VOTE]: createDecoder(CONTENT_TOPICS['vote']),
}

/**
 * Encode a message object into a Uint8Array for transmission
 */
export function encodeMessage(message: OpchanMessage): Uint8Array {
  const messageJson = JSON.stringify(message);
  return new TextEncoder().encode(messageJson);
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

/**
 * Decode a message from a Uint8Array based on its type
 */
function decodeMessage(payload: Uint8Array, type?: MessageType): OpchanMessage {
  const messageJson = new TextDecoder().decode(payload);  
  const message = JSON.parse(messageJson) as OpchanMessage;
  
  if (type && message.type !== type) {
    throw new Error(`Expected message of type ${type}, but got ${message.type}`);
  }
  
  // Return the decoded message
  return message;
}