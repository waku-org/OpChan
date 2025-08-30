import { IDecodedMessage, IDecoder, IEncoder, LightNode } from '@waku/sdk';
import { MessageType } from '../../types/waku';
import {
  CellMessage,
  PostMessage,
  CommentMessage,
  VoteMessage,
} from '../../types/waku';
import { CONTENT_TOPICS } from './constants';
import { OpchanMessage } from '@/types/forum';

export class CodecManager {
  private encoders: Map<MessageType, IEncoder> = new Map();
  private decoders: Map<MessageType, IDecoder<IDecodedMessage>> = new Map();

  constructor(private node: LightNode) {
    this.encoders = new Map(
      Object.values(MessageType).map(type => [
        type,
        this.node.createEncoder({ contentTopic: CONTENT_TOPICS[type] }),
      ])
    );

    this.decoders = new Map(
      Object.values(MessageType).map(type => [
        type,
        this.node.createDecoder({ contentTopic: CONTENT_TOPICS[type] }),
      ])
    );
  }

  /**
   * Encode a message for transmission
   */
  encodeMessage(message: OpchanMessage): Uint8Array {
    const messageJson = JSON.stringify(message);
    return new TextEncoder().encode(messageJson);
  }

  /**
   * Decode a received message
   */
  decodeMessage(payload: Uint8Array): OpchanMessage {
    const messageJson = new TextDecoder().decode(payload);
    const message = JSON.parse(messageJson) as OpchanMessage;

    switch (message.type) {
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

  /**
   * Get encoder for a specific message type
   */
  getEncoder(messageType: MessageType): IEncoder {
    const encoder = this.encoders.get(messageType);
    if (!encoder) {
      throw new Error(`No encoder found for message type: ${messageType}`);
    }
    return encoder;
  }

  /**
   * Get decoder for a specific message type
   */
  getDecoder(messageType: MessageType): IDecoder<IDecodedMessage> {
    const decoder = this.decoders.get(messageType);
    if (!decoder) {
      throw new Error(`No decoder found for message type: ${messageType}`);
    }
    return decoder;
  }

  /**
   * Get all decoders for subscribing to multiple message types
   */
  getAllDecoders(): IDecoder<IDecodedMessage>[] {
    return Array.from(this.decoders.values());
  }

  /**
   * Get decoders for specific message types
   */
  getDecoders(messageTypes: MessageType[]): IDecoder<IDecodedMessage>[] {
    return messageTypes.map(type => this.getDecoder(type));
  }
}
