import { OpchanMessage } from "@/types/forum";
import { CacheService } from "./CacheService";
import { ReliableMessaging, MessageStatusCallback } from "../core/ReliableMessaging";
import { WakuNodeManager } from "../core/WakuNodeManager";

export type MessageReceivedCallback = (message: OpchanMessage) => void;
export type { MessageStatusCallback };

export class MessageService {
  private messageReceivedCallbacks: Set<MessageReceivedCallback> = new Set();

  constructor(
    private cacheService: CacheService,
    private reliableMessaging: ReliableMessaging | null,
    private nodeManager: WakuNodeManager
  ) {
    this.setupMessageHandling();
  }

  private setupMessageHandling(): void {
    if (this.reliableMessaging) {
      this.reliableMessaging.onMessage((message) => {
        const isNew = this.cacheService.updateCache(message);
        if (isNew) {
          this.messageReceivedCallbacks.forEach(callback => callback(message));
        }
      });
    }
  }

  public async sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<void> {
    if (!this.reliableMessaging) {
      throw new Error("Reliable messaging not initialized");
    }

    if (!this.nodeManager.isReady) {
      throw new Error("Network not ready");
    }

    // Update cache optimistically
    this.cacheService.updateCache(message);
    
    // Send via reliable messaging with status tracking
      await this.reliableMessaging.sendMessage(message, {
        onSent: (id) => {
          console.log(`Message ${id} sent`);
          statusCallback?.onSent?.(id);
        },
        onAcknowledged: (id) => {
          console.log(`Message ${id} acknowledged`);
          statusCallback?.onAcknowledged?.(id);
        },
        onError: (id, error) => {
          console.error(`Message ${id} failed:`, error);
          statusCallback?.onError?.(id, error);
        }
      });
    }

  public onMessageReceived(callback: MessageReceivedCallback): () => void {
    this.messageReceivedCallbacks.add(callback);
    return () => this.messageReceivedCallbacks.delete(callback);
  }

  public updateReliableMessaging(reliableMessaging: ReliableMessaging | null): void {
    this.reliableMessaging = reliableMessaging;
    this.setupMessageHandling();
  }

  public get messageCache() {
    return this.cacheService.cache;
  }

  public cleanup(): void {
    this.messageReceivedCallbacks.clear();
    this.reliableMessaging?.cleanup();
  }
}
