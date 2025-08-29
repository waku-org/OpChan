import { createDecoder, createEncoder } from '@waku/sdk';
import { MessageType } from './types';
import {  CellMessage, PostMessage, CommentMessage, VoteMessage } from './types';
import { CONTENT_TOPICS, NETWORK_CONFIG } from './constants';
import { OpchanMessage } from '@/types/forum';

// Create the sharded pubsub topic
const PUBSUB_TOPIC = `/waku/2/rs/${NETWORK_CONFIG.clusterId}/0`;

export const encoders = {
    [MessageType.CELL]: createEncoder({
        contentTopic: CONTENT_TOPICS[MessageType.CELL],
        routingInfo: { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }
    }),
    [MessageType.POST]: createEncoder({
      contentTopic: CONTENT_TOPICS[MessageType.POST],
      routingInfo: { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }
    }),
    [MessageType.COMMENT]: createEncoder({
      contentTopic: CONTENT_TOPICS[MessageType.COMMENT],
      routingInfo: { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }
    }),
    [MessageType.VOTE]: createEncoder({
      contentTopic: CONTENT_TOPICS[MessageType.VOTE],
      routingInfo: { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }
    }),
    [MessageType.MODERATE]: createEncoder({
      contentTopic: CONTENT_TOPICS[MessageType.MODERATE],
      routingInfo: { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }
    })
}

export const decoders = {
    [MessageType.CELL]: createDecoder(CONTENT_TOPICS[MessageType.CELL], { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }),
    [MessageType.POST]: createDecoder(CONTENT_TOPICS[MessageType.POST], { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }),
    [MessageType.COMMENT]: createDecoder(CONTENT_TOPICS[MessageType.COMMENT], { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }),
    [MessageType.VOTE]: createDecoder(CONTENT_TOPICS[MessageType.VOTE], { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC }),
    [MessageType.MODERATE]: createDecoder(CONTENT_TOPICS[MessageType.MODERATE], { clusterId: NETWORK_CONFIG.clusterId, shardId: 0, pubsubTopic: PUBSUB_TOPIC })
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
export function decodeMessage(payload: Uint8Array): OpchanMessage {
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