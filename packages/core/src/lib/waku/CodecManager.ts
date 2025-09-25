import { IDecodedMessage, IDecoder, IEncoder, LightNode } from '@waku/sdk';
import { MessageType, UserProfileUpdateMessage } from '../../types/waku';
import {
  CellMessage,
  PostMessage,
  CommentMessage,
  VoteMessage,
  ModerateMessage,
} from '../../types/waku';
import { CONTENT_TOPIC } from './constants';
import { OpchanMessage } from '../../types/forum';

export class CodecManager {
  private encoder: IEncoder;
  private decoder: IDecoder<IDecodedMessage>;

  constructor(private node: LightNode) {
    this.encoder = this.node.createEncoder({ contentTopic: CONTENT_TOPIC });
    this.decoder = this.node.createDecoder({ contentTopic: CONTENT_TOPIC });
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
      case MessageType.MODERATE:
        return message as ModerateMessage;
      case MessageType.USER_PROFILE_UPDATE:
        return message as UserProfileUpdateMessage;
      default:
        throw new Error(`Unknown message type: ${JSON.stringify(message)}`);
    }
  }

  /**
   * Get the single encoder for all message types
   */
  getEncoder(): IEncoder {
    return this.encoder;
  }

  /**
   * Get the single decoder for all message types
   */
  getDecoder(): IDecoder<IDecodedMessage> {
    return this.decoder;
  }

  /**
   * Get all decoders (returns single decoder in array for compatibility)
   */
  getAllDecoders(): IDecoder<IDecodedMessage>[] {
    return [this.decoder];
  }

  /**
   * Get decoders for specific message types (returns single decoder for all types)
   */
  getDecoders(_messageTypes: MessageType[]): IDecoder<IDecodedMessage>[] {
    return [this.decoder];
  }
}
