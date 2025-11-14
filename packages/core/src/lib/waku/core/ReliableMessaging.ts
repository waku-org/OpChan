import {
  IDecodedMessage,
  LightNode,
  ReliableChannel,
  ReliableChannelEvents,
} from '@waku/sdk';
import { CodecManager } from '../CodecManager';
import { generateStringId } from '../../utils';
import { OpchanMessage } from '../../../types/forum';
import { WakuConfig } from '../../../types';

export interface MessageStatusCallback {
  onSent?: (messageId: string) => void;
  onAcknowledged?: (messageId: string) => void;
  onError?: (messageId: string, error: string) => void;
}

export type IncomingMessageCallback = (message: OpchanMessage) => void;
export type SyncStatusCallback = (status: 'syncing' | 'synced', detail: { received: number; missing: number; lost: number }) => void;

export class ReliableMessaging {
  private channel: ReliableChannel<IDecodedMessage> | null = null;
  private messageCallbacks: Map<string, MessageStatusCallback> = new Map();
  private incomingMessageCallbacks: Set<IncomingMessageCallback> = new Set();
  private syncStatusCallbacks: Set<SyncStatusCallback> = new Set();
  private codecManager: CodecManager;

  constructor(node: LightNode, config: WakuConfig) {
    this.codecManager = new CodecManager(node, config);
    this.initializeChannel(node, config);
    
  }

  // ===== PUBLIC METHODS =====

  public async sendMessage(
    message: OpchanMessage,
    statusCallback?: MessageStatusCallback
  ) {
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

  public onSyncStatus(callback: SyncStatusCallback): () => void {
    this.syncStatusCallbacks.add(callback);
    return () => this.syncStatusCallbacks.delete(callback);
  }

  public cleanup(): void {
    this.messageCallbacks.clear();
    this.incomingMessageCallbacks.clear();
    this.syncStatusCallbacks.clear();
    this.channel = null;
  }

  // ===== PRIVATE METHODS =====

  private async initializeChannel(node: LightNode, config: WakuConfig): Promise<void> {
    const encoder = this.codecManager.getEncoder();
    const decoder = this.codecManager.getDecoder();
    const senderId = generateStringId();
    const channelId = config.reliableChannelId || 'opchan-messages';

    try {
      this.channel = await ReliableChannel.create(
        node,
        channelId,
        senderId,
        encoder,
        decoder
      );
      this.setupChannelListeners(this.channel);
      this.setupSyncStatusListeners(this.channel);
    } catch (error) {
      console.error('Failed to create reliable channel:', error);
    }
  }

  private setupSyncStatusListeners(channel: ReliableChannel<IDecodedMessage>): void {
    // Check if syncStatus API is available
    if (!channel.syncStatus) {
      console.warn('ReliableChannel.syncStatus is not available in this SDK version');
      return;
    }

    channel.syncStatus.addEventListener('syncing', (event) => {
      const detail = event.detail;
      this.syncStatusCallbacks.forEach(cb => cb('syncing', detail));
    });

    channel.syncStatus.addEventListener('synced', (event) => {
      const detail = event.detail;
      this.syncStatusCallbacks.forEach(cb => cb('synced', detail));
    });
  }

  private setupChannelListeners(
    channel: ReliableChannel<IDecodedMessage>
  ): void {
    channel.addEventListener("message-received", event => {
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

    channel.addEventListener("message-sent", event => {
      const messageId = event.detail;
      this.messageCallbacks.get(messageId)?.onSent?.(messageId);
    });

    channel.addEventListener(
      "message-acknowledged",
      event => {
        const messageId = event.detail;
        this.messageCallbacks.get(messageId)?.onAcknowledged?.(messageId);
      }
    );

    channel.addEventListener(
      "sending-message-irrecoverable-error",
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
}
