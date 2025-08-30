import {
  IDecodedMessage,
  LightNode,
  ReliableChannel,
  ReliableChannelEvent,
} from '@waku/sdk';
import { MessageType } from '../../../types/waku';
import { CodecManager } from '../CodecManager';
import { generateStringId } from '@/lib/utils';
import { OpchanMessage } from '@/types/forum';

export interface MessageStatusCallback {
  onSent?: (messageId: string) => void;
  onAcknowledged?: (messageId: string) => void;
  onError?: (messageId: string, error: string) => void;
}

export type IncomingMessageCallback = (message: OpchanMessage) => void;

export class ReliableMessaging {
  private channels: Map<MessageType, ReliableChannel<IDecodedMessage>> =
    new Map();
  private messageCallbacks: Map<string, MessageStatusCallback> = new Map();
  private incomingMessageCallbacks: Set<IncomingMessageCallback> = new Set();
  private codecManager: CodecManager;

  constructor(node: LightNode) {
    this.codecManager = new CodecManager(node);
    this.initializeChannels(node);
  }

  private async initializeChannels(node: LightNode): Promise<void> {
    for (const type of Object.values(MessageType)) {
      const encoder = this.codecManager.getEncoder(type);
      const decoder = this.codecManager.getDecoder(type);
      const senderId = generateStringId();
      const channelId = `opchan-${type}`;

      try {
        const channel = await ReliableChannel.create(
          node,
          channelId,
          senderId,
          encoder,
          decoder
        );
        this.channels.set(type, channel);
        this.setupChannelListeners(channel, type);
      } catch (error) {
        console.error(`Failed to create reliable channel for ${type}:`, error);
      }
    }
  }

  private setupChannelListeners(
    channel: ReliableChannel<IDecodedMessage>,
    type: MessageType
  ): void {
    channel.addEventListener(ReliableChannelEvent.InMessageReceived, event => {
      try {
        const wakuMessage = event.detail;
        if (wakuMessage.payload) {
          const opchanMessage = this.codecManager.decodeMessage(
            wakuMessage.payload
          );
          this.incomingMessageCallbacks.forEach(callback =>
            callback(opchanMessage)
          );
        }
      } catch (error) {
        console.error(`Failed to process incoming message for ${type}:`, error);
      }
    });

    channel.addEventListener(ReliableChannelEvent.OutMessageSent, event => {
      const messageId = event.detail;
      this.messageCallbacks.get(messageId)?.onSent?.(messageId);
    });

    channel.addEventListener(
      ReliableChannelEvent.OutMessageAcknowledged,
      event => {
        const messageId = event.detail;
        this.messageCallbacks.get(messageId)?.onAcknowledged?.(messageId);
      }
    );

    channel.addEventListener(
      ReliableChannelEvent.OutMessageIrrecoverableError,
      event => {
        const messageId = event.detail.messageId;
        const error = event.detail.error;
        const callback = this.messageCallbacks.get(messageId);

        if (callback?.onError) {
          callback.onError(messageId, error?.toString() || 'Unknown error');
        }

        this.messageCallbacks.delete(messageId);
      }
    );
  }

  public async sendMessage(
    message: OpchanMessage,
    statusCallback?: MessageStatusCallback
  ): Promise<void> {
    const channel = this.channels.get(message.type);
    if (!channel) {
      throw new Error(`No reliable channel for message type: ${message.type}`);
    }

    const encodedMessage = this.codecManager.encodeMessage(message);
    const messageId = ReliableChannel.getMessageId(encodedMessage);

    if (statusCallback) {
      this.messageCallbacks.set(messageId, statusCallback);
    }

    try {
      return channel.send(encodedMessage);
    } catch (error) {
      this.messageCallbacks.delete(messageId);
      throw error;
    }
  }

  public onMessage(callback: IncomingMessageCallback): () => void {
    this.incomingMessageCallbacks.add(callback);
    return () => this.incomingMessageCallbacks.delete(callback);
  }

  public cleanup(): void {
    this.messageCallbacks.clear();
    this.incomingMessageCallbacks.clear();
    this.channels.clear();
  }
}
