import { OpchanMessage } from '../../../types/forum';
import {
  ReliableMessaging,
  MessageStatusCallback,
} from '../core/ReliableMessaging';
import { WakuNodeManager } from '../core/WakuNodeManager';
import { localDatabase } from '../../database/LocalDatabase';

export type MessageReceivedCallback = (message: OpchanMessage) => void;
export type { MessageStatusCallback };

export class MessageService {
  private messageReceivedCallbacks: Set<MessageReceivedCallback> = new Set();

  constructor(
    private reliableMessaging: ReliableMessaging | null,
    private nodeManager: WakuNodeManager
  ) {
    this.setupMessageHandling();
  }

  // ===== PUBLIC METHODS =====

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
          try { localDatabase.clearPending(message.id); } catch {}
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

  public updateReliableMessaging(
    reliableMessaging: ReliableMessaging | null
  ): void {
    this.reliableMessaging = reliableMessaging;
    this.setupMessageHandling();
  }

  public cleanup(): void {
    this.messageReceivedCallbacks.clear();
    this.reliableMessaging?.cleanup();
  }

  // ===== PRIVATE METHODS =====

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
    }
  }
}
