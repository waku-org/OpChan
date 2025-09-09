import {
  IDecodedMessage,
  LightNode,
  ReliableChannel,
  ReliableChannelEvent,
} from '@waku/sdk';
import { CodecManager } from '../CodecManager';
import { generateStringId } from '@/lib/utils';
import { OpchanMessage } from '@/types/forum';
import { HistoryEntry, MessageChannelEvent } from '@waku/sds';

export interface MessageStatusCallback {
  onSent?: (messageId: string) => void;
  onAcknowledged?: (messageId: string) => void;
  onError?: (messageId: string, error: string) => void;
}

export interface MissingMessageInfo {
  messageId: Uint8Array;
  retrievalHint?: Uint8Array;
}

export interface MissingMessageEvent {
  missingMessages: MissingMessageInfo[];
}

export type IncomingMessageCallback = (message: OpchanMessage) => void;
export type MissingMessageCallback = (event: MissingMessageEvent) => void;

export class ReliableMessaging {
  private channel: ReliableChannel<IDecodedMessage> | null = null;
  private messageCallbacks: Map<string, MessageStatusCallback> = new Map();
  private incomingMessageCallbacks: Set<IncomingMessageCallback> = new Set();
  private missingMessageCallbacks: Set<MissingMessageCallback> = new Set();
  private codecManager: CodecManager;
  private seenMessages: Set<string> = new Set();
  private missingMessages: Map<string, MissingMessageInfo> = new Map();
  private recoveredMessages: Set<string> = new Set();

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
        console.log('Received incoming message:', wakuMessage);
        if (wakuMessage.payload) {
          // Check if this message fills a gap in missing messages
          const messageId = this.getMessageIdFromPayload(wakuMessage.payload);
          if (messageId && this.missingMessages.has(messageId)) {
            this.recoveredMessages.add(messageId);
            this.missingMessages.delete(messageId);
            console.log('Missing message recovered:', messageId.substring(0, 12) + '...');
          }

          // Mark message as seen to avoid processing duplicates
          if (messageId) {
            if (this.seenMessages.has(messageId)) {
              console.log('Duplicate message ignored:', messageId.substring(0, 12) + '...');
              return;
            }
            this.seenMessages.add(messageId);
          }

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

    // Setup missing message detection
    this.setupMissingMessageDetection(channel);
  }

  private setupMissingMessageDetection(
    channel: ReliableChannel<IDecodedMessage>
  ): void {
    try {
      
      const messageChannel = (channel).messageChannel;
      
        messageChannel.addEventListener(MessageChannelEvent.InMessageMissing, (event) => {
          this.handleMissingMessages(event.detail);
        });
        console.log('Missing message detection enabled');
      
    } catch (error) {
      console.warn('Failed to setup missing message detection:', error);
    }
  }

  
  private handleMissingMessages(missingMessageData: HistoryEntry[]): void {
    try {
      const missingMessages: MissingMessageInfo[] = [];
      
      if (Array.isArray(missingMessageData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        missingMessageData.forEach((item: any) => {
          if (item.messageId) {
            const messageId = this.bytesToHex(item.messageId);
            const missingInfo: MissingMessageInfo = {
              messageId: item.messageId,
              retrievalHint: item.retrievalHint,
            };
            
            // Store missing message info for tracking
            if (!this.missingMessages.has(messageId) && !this.recoveredMessages.has(messageId)) {
              this.missingMessages.set(messageId, missingInfo);
              missingMessages.push(missingInfo);
            }
          }
        });
      }

      if (missingMessages.length > 0) {
        console.log(`Detected ${missingMessages.length} missing messages`);
        const event: MissingMessageEvent = { missingMessages };
        this.missingMessageCallbacks.forEach(callback => callback(event));
      }
    } catch (error) {
      console.error('Failed to handle missing messages:', error);
    }
  }

  private getMessageIdFromPayload(payload: Uint8Array): string | null {
    try {
      const messageId = (ReliableChannel).getMessageId?.(payload);
      if (messageId) {
        return this.bytesToHex(messageId);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get message ID from payload:', error);
      return null;
    }
  }

  private bytesToHex(bytes: Uint8Array): string {
    if (!bytes || bytes.length === 0) return '';
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
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

  public onMissingMessage(callback: MissingMessageCallback): () => void {
    this.missingMessageCallbacks.add(callback);
    return () => this.missingMessageCallbacks.delete(callback);
  }

  public getMissingMessages(): MissingMessageInfo[] {
    return Array.from(this.missingMessages.values());
  }

  public getRecoveredMessages(): string[] {
    return Array.from(this.recoveredMessages);
  }

  public getMissingMessageCount(): number {
    return this.missingMessages.size;
  }

  public getRecoveredMessageCount(): number {
    return this.recoveredMessages.size;
  }

  public cleanup(): void {
    this.messageCallbacks.clear();
    this.incomingMessageCallbacks.clear();
    this.missingMessageCallbacks.clear();
    this.seenMessages.clear();
    this.missingMessages.clear();
    this.recoveredMessages.clear();
    this.channel = null;
  }
}
