import { OpchanMessage } from '@/types/forum';
import {
  ReliableMessaging,
  MessageStatusCallback,
  MissingMessageEvent,
  MissingMessageInfo,
} from '../core/ReliableMessaging';
import { WakuNodeManager } from '../core/WakuNodeManager';
import { localDatabase } from '@/lib/database/LocalDatabase';

export type MessageReceivedCallback = (message: OpchanMessage) => void;
export type MissingMessageCallback = (event: MissingMessageEvent) => void;
export type { MessageStatusCallback, MissingMessageEvent, MissingMessageInfo };

export class MessageService {
  private messageReceivedCallbacks: Set<MessageReceivedCallback> = new Set();
  private missingMessageCallbacks: Set<MissingMessageCallback> = new Set();

  constructor(
    private reliableMessaging: ReliableMessaging | null,
    private nodeManager: WakuNodeManager
  ) {
    this.setupMessageHandling();
  }

  private setupMessageHandling(): void {
    if (this.reliableMessaging) {
      this.reliableMessaging.onMessage(async message => {
        localDatabase.setSyncing(true);
        const isNew = await localDatabase.updateCache(message);
        // Defensive: clear pending on inbound message to avoid stuck state
        localDatabase.clearPending(message.id);
        localDatabase.setSyncing(false);
        if (isNew) this.messageReceivedCallbacks.forEach(cb => cb(message));
      });

      // Setup missing message handling
      this.reliableMessaging.onMissingMessage(event => {
        console.log(`Missing messages detected: ${event.missingMessages.length}`);
        this.missingMessageCallbacks.forEach(cb => cb(event));
      });
    }
  }

  public async sendMessage(
    message: OpchanMessage,
    statusCallback?: MessageStatusCallback
  ): Promise<{ success: boolean; message?: OpchanMessage; error?: string }> {
    if (!this.reliableMessaging) {
      return { success: false, error: 'Reliable messaging not initialized' };
    }

    if (!this.nodeManager.isReady) {
      return { success: false, error: 'Network not ready' };
    }

    try {
      // Update cache optimistically
      await localDatabase.updateCache(message);
      localDatabase.markPending(message.id);

      // Send via reliable messaging with status tracking
      localDatabase.setSyncing(true);
      await this.reliableMessaging.sendMessage(message, {
        onSent: id => {
          console.log(`Message ${id} sent`);
          statusCallback?.onSent?.(id);
        },
        onAcknowledged: id => {
          console.log(`Message ${id} acknowledged`);
          statusCallback?.onAcknowledged?.(id);
          localDatabase.clearPending(message.id);
          localDatabase.updateLastSync(Date.now());
          localDatabase.setSyncing(false);
        },
        onError: (id, error) => {
          console.error(`Message ${id} failed:`, error);
          statusCallback?.onError?.(id, error);
          // Keep pending entry to allow retry logic later
          localDatabase.setSyncing(false);
        },
      });

      return { success: true, message };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public onMessageReceived(callback: MessageReceivedCallback): () => void {
    this.messageReceivedCallbacks.add(callback);
    return () => this.messageReceivedCallbacks.delete(callback);
  }

  public onMissingMessage(callback: MissingMessageCallback): () => void {
    this.missingMessageCallbacks.add(callback);
    return () => this.missingMessageCallbacks.delete(callback);
  }

  public getMissingMessages(): MissingMessageInfo[] {
    return this.reliableMessaging?.getMissingMessages() || [];
  }

  public getRecoveredMessages(): string[] {
    return this.reliableMessaging?.getRecoveredMessages() || [];
  }

  public getMissingMessageCount(): number {
    return this.reliableMessaging?.getMissingMessageCount() || 0;
  }

  public getRecoveredMessageCount(): number {
    return this.reliableMessaging?.getRecoveredMessageCount() || 0;
  }

  public updateReliableMessaging(
    reliableMessaging: ReliableMessaging | null
  ): void {
    this.reliableMessaging = reliableMessaging;
    this.setupMessageHandling();
  }

  public get messageCache() {
    return localDatabase.cache;
  }

  public cleanup(): void {
    this.messageReceivedCallbacks.clear();
    this.missingMessageCallbacks.clear();
    this.reliableMessaging?.cleanup();
  }
}
