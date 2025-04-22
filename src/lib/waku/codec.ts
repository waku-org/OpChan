import { createDecoder, createEncoder } from '@waku/sdk';
import { MessageType } from './types';
import {  CellMessage, PostMessage, CommentMessage, VoteMessage } from './types';
import { CONTENT_TOPICS, NETWORK_CONFIG } from './constants';
import { OpchanMessage } from '@/types';

export const encoders = {
    [MessageType.CELL]: createEncoder({
        contentTopic: CONTENT_TOPICS['cell'],
        pubsubTopicShardInfo: {clusterId: NETWORK_CONFIG.clusterId, shard: 0}
    }),
    [MessageType.POST]: createEncoder({
      contentTopic: CONTENT_TOPICS['post'], 
      pubsubTopicShardInfo: {clusterId: NETWORK_CONFIG.clusterId, shard: 0}
    }),
    [MessageType.COMMENT]: createEncoder({
      contentTopic: CONTENT_TOPICS['comment'],
      pubsubTopicShardInfo: {clusterId: NETWORK_CONFIG.clusterId, shard: 0}
    }),
    [MessageType.VOTE]: createEncoder({
      contentTopic: CONTENT_TOPICS['vote'],
      pubsubTopicShardInfo: {clusterId: NETWORK_CONFIG.clusterId, shard: 0}
    }),
}

export const decoders = {
    [MessageType.CELL]: createDecoder(CONTENT_TOPICS['cell'], {
        clusterId: NETWORK_CONFIG.clusterId,
        shard: 0
    }),
    [MessageType.POST]: createDecoder(CONTENT_TOPICS['post'], {
        clusterId: NETWORK_CONFIG.clusterId,
        shard: 0
    }),
    [MessageType.COMMENT]: createDecoder(CONTENT_TOPICS['comment'], {
        clusterId: NETWORK_CONFIG.clusterId,
        shard: 0
    }),
    [MessageType.VOTE]: createDecoder(CONTENT_TOPICS['vote'], {
        clusterId: NETWORK_CONFIG.clusterId,
        shard: 0
    }),
}

/**
 * Encode a message object into a Uint8Array for transmission
 */
export function encodeMessage(message: OpchanMessage): Uint8Array {
  const messageJson = JSON.stringify(message);
  return new TextEncoder().encode(messageJson);
}


/**
 * Decode a message from a Uint8Array based on its type
 */
export function decodeMessage(payload: Uint8Array): CellMessage | PostMessage | CommentMessage | VoteMessage {
  const messageJson = new TextDecoder().decode(payload);  
  const message = JSON.parse(messageJson) as OpchanMessage;
  
  
  switch(message.type) {
    case MessageType.CELL:
      return message as CellMessage;
    case MessageType.POST:
      return message as PostMessage;
    case MessageType.COMMENT:
      return message as CommentMessage;
    case MessageType.VOTE:
      return message as VoteMessage;
    default:
      throw new Error(`Unknown message type: ${message}`);
  }
}