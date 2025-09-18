import {
  IDecodedMessage,
  LightNode,
  ReliableChannel,
  ReliableChannelEvent,
} from '@waku/sdk';
import { CodecManager } from '../CodecManager';
import { generateStringId } from '../../utils';
import { OpchanMessage } from '../../../types/forum';

export interface MessageStatusCallback {
  onSent?: (messageId: string) => void;
  onAcknowledged?: (messageId: string) => void;
  onError?: (messageId: string, error: string) => void;
}

export type IncomingMessageCallback = (message: OpchanMessage) => void;

export class ReliableMessaging {
  private channel: ReliableChannel<IDecodedMessage> | null = null;
  private messageCallbacks: Map<string, MessageStatusCallback> = new Map();
  private incomingMessageCallbacks: Set<IncomingMessageCallback> = new Set();
  private codecManager: CodecManager;

  constructor(node: LightNode) {
    this.codecManager = new CodecManager(node);
    this.initializeChannel(node);
  }

  private async initializeChannel(node: LightNode): Promise<void> {
    const encoder = this.codecManager.getEncoder();
    const decoder = this.codecManager.getDecoder();
    const senderId = generateStringId();
    const channelId = 'opchan-messages';

    try {
      this.channel = await ReliableChannel.create(
        node,
        channelId,
        senderId,
        encoder,
        decoder
      );
      this.setupChannelListeners(this.channel);
    } catch (error) {
      console.error('Failed to create reliable channel:', error);
    }
  }

  private setupChannelListeners(
    channel: ReliableChannel<IDecodedMessage>
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
        console.error('Failed to process incoming message:', error);
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
    if (!this.channel) {
      throw new Error('Reliable channel not initialized');
    }

    const encodedMessage = this.codecManager.encodeMessage(message);
    const messageId = ReliableChannel.getMessageId(encodedMessage);

    if (statusCallback) {
      this.messageCallbacks.set(messageId, statusCallback);
    }

    try {
      return this.channel.send(encodedMessage);
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
    this.channel = null;
  }
}
