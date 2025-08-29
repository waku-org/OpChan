import { HealthStatus } from "@waku/sdk";
import { OpchanMessage } from "@/types/forum";
import { WakuNodeManager, HealthChangeCallback } from "./core/WakuNodeManager";
import { CacheService } from "./services/CacheService";
import { MessageService, MessageStatusCallback } from "./services/MessageService";
import { ReliableMessaging } from "./core/ReliableMessaging";

export type { HealthChangeCallback, MessageStatusCallback };

class MessageManager {
  private nodeManager: WakuNodeManager | null = null;
  private cacheService: CacheService;
  private messageService: MessageService | null = null;
  private reliableMessaging: ReliableMessaging | null = null;

  constructor() {
    this.cacheService = new CacheService();
  }

  public static async create(): Promise<MessageManager> {
    const manager = new MessageManager();
    await manager.initialize();
    return manager;
  }

  private async initialize(): Promise<void> {
    try {
      this.nodeManager = await WakuNodeManager.create();
      
      // Now create message service with proper dependencies
      this.messageService = new MessageService(this.cacheService, this.reliableMessaging, this.nodeManager);
      
      // Set up health-based reliable messaging initialization
      this.nodeManager.onHealthChange((isReady) => {
        if (isReady && !this.reliableMessaging) {
          this.initializeReliableMessaging();
        } else if (!isReady && this.reliableMessaging) {
          this.cleanupReliableMessaging();
        }
      });
      
    } catch (error) {
      console.error("Failed to initialize MessageManager:", error);
      throw error;
    }
  }

  private async initializeReliableMessaging(): Promise<void> {
    if (!this.nodeManager || this.reliableMessaging) {
      return;
    }

          try {
        console.log("Initializing reliable messaging...");
        this.reliableMessaging = new ReliableMessaging(this.nodeManager.getNode());
        this.messageService?.updateReliableMessaging(this.reliableMessaging);
        console.log("Reliable messaging initialized successfully");
      } catch (error) {
        console.error("Failed to initialize reliable messaging:", error);
      }
  }

  private cleanupReliableMessaging(): void {
    if (this.reliableMessaging) {
      console.log("Cleaning up reliable messaging due to health status");
      this.reliableMessaging.cleanup();
      this.reliableMessaging = null;
      this.messageService?.updateReliableMessaging(null);
    }
  }

  public async stop(): Promise<void> {
    this.cleanupReliableMessaging();
    this.messageService?.cleanup();
    await this.nodeManager?.stop();
  }

  public get isReady(): boolean {
    return this.nodeManager?.isReady ?? false;
  }

  public get currentHealth(): HealthStatus {
    return this.nodeManager?.currentHealth ?? HealthStatus.Unhealthy;
  }

  public onHealthChange(callback: HealthChangeCallback): () => void {
    if (!this.nodeManager) {
      throw new Error("Node manager not initialized");
    }
    return this.nodeManager.onHealthChange(callback);
  }

  public async sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<string> {
    if (!this.messageService) {
      throw new Error("MessageManager not fully initialized");
    }
    return this.messageService.sendMessage(message, statusCallback);
  }

  public onMessageReceived(callback: (message: OpchanMessage) => void): () => void {
    if (!this.messageService) {
      throw new Error("MessageManager not fully initialized");
    }
    return this.messageService.onMessageReceived(callback);
  }

  public get messageCache() {
    if (!this.messageService) {
      throw new Error("MessageManager not fully initialized");
    }
    return this.messageService.messageCache;
  }
}

const messageManager = await MessageManager.create();
export default messageManager;
