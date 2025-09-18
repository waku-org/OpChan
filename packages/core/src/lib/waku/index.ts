import { HealthStatus } from '@waku/sdk';
import { OpchanMessage } from '../../types/forum';
import { WakuNodeManager, HealthChangeCallback } from './core/WakuNodeManager';
import {
  MessageService,
  MessageStatusCallback,
} from './services/MessageService';
import { ReliableMessaging } from './core/ReliableMessaging';

export type { HealthChangeCallback, MessageStatusCallback };

class MessageManager {
  private nodeManager: WakuNodeManager | null = null;
  // LocalDatabase eliminates the need for CacheService
  private messageService: MessageService | null = null;
  private reliableMessaging: ReliableMessaging | null = null;

  constructor() {}

  public static async create(): Promise<MessageManager> {
    const manager = new MessageManager();
    await manager.initialize();
    return manager;
  }

  private async initialize(): Promise<void> {
    try {
      this.nodeManager = await WakuNodeManager.create();

      // Now create message service with proper dependencies
      this.messageService = new MessageService(
        this.reliableMessaging,
        this.nodeManager
      );

      // Set up health-based reliable messaging initialization
      this.nodeManager.onHealthChange(isReady => {
        if (isReady && !this.reliableMessaging) {
          this.initializeReliableMessaging();
        } else if (!isReady && this.reliableMessaging) {
          this.cleanupReliableMessaging();
        }
      });
    } catch (error) {
      console.error('Failed to initialize MessageManager:', error);
      throw error;
    }
  }

  private async initializeReliableMessaging(): Promise<void> {
    if (!this.nodeManager || this.reliableMessaging) {
      return;
    }

    try {
      console.log('Initializing reliable messaging...');
      this.reliableMessaging = new ReliableMessaging(
        this.nodeManager.getNode()
      );
      this.messageService?.updateReliableMessaging(this.reliableMessaging);
      console.log('Reliable messaging initialized successfully');
    } catch (error) {
      console.error('Failed to initialize reliable messaging:', error);
    }
  }

  private cleanupReliableMessaging(): void {
    if (this.reliableMessaging) {
      console.log('Cleaning up reliable messaging due to health status');
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
      throw new Error('Node manager not initialized');
    }
    return this.nodeManager.onHealthChange(callback);
  }

  //TODO: return event handlers?
  public async sendMessage(
    message: OpchanMessage,
    statusCallback?: MessageStatusCallback
  ): Promise<void> {
    if (!this.messageService) {
      throw new Error('MessageManager not fully initialized');
    }
    this.messageService.sendMessage(message, statusCallback);
  }

  public onMessageReceived(
    callback: (message: OpchanMessage) => void
  ): () => void {
    if (!this.messageService) {
      throw new Error('MessageManager not fully initialized');
    }
    return this.messageService.onMessageReceived(callback);
  }

  public get messageCache() {
    if (!this.messageService) {
      throw new Error('MessageManager not fully initialized');
    }
    return this.messageService.messageCache;
  }
}

// Create a default instance that can be used synchronously but initialized asynchronously
export class DefaultMessageManager {
  private _instance: MessageManager | null = null;
  private _initPromise: Promise<MessageManager> | null = null;
  private _pendingHealthSubscriptions: HealthChangeCallback[] = [];
  private _pendingMessageSubscriptions: ((message: any) => void)[] = [];

  // Initialize the manager asynchronously
  async initialize(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = MessageManager.create();
    }
    this._instance = await this._initPromise;
    
    // Establish all pending health subscriptions
    this._pendingHealthSubscriptions.forEach(callback => {
      this._instance!.onHealthChange(callback);
    });
    this._pendingHealthSubscriptions = [];
    
    // Establish all pending message subscriptions
    this._pendingMessageSubscriptions.forEach(callback => {
      this._instance!.onMessageReceived(callback);
    });
    this._pendingMessageSubscriptions = [];
  }

  // Get the messageCache (most common usage)
  get messageCache() {
    if (!this._instance) {
      // Return empty cache structure for compatibility during initialization
      return {
        cells: {},
        posts: {},
        comments: {},
        votes: {},
        moderations: {},
        userIdentities: {},
        bookmarks: {},
      };
    }
    return this._instance.messageCache;
  }

  // Proxy other common methods
  get isReady(): boolean {
    return this._instance?.isReady ?? false;
  }

  get currentHealth() {
    return this._instance?.currentHealth;
  }

  async sendMessage(message: any, callback?: any): Promise<void> {
    if (!this._instance) {
      await this.initialize();
    }
    return this._instance!.sendMessage(message, callback);
  }

  onHealthChange(callback: any) {
    if (!this._instance) {
      // Queue the callback for when we're initialized
      this._pendingHealthSubscriptions.push(callback);
      
      // Return a function that removes from the pending queue
      return () => {
        const index = this._pendingHealthSubscriptions.indexOf(callback);
        if (index !== -1) {
          this._pendingHealthSubscriptions.splice(index, 1);
        }
      };
    }
    return this._instance.onHealthChange(callback);
  }

  onMessageReceived(callback: any) {
    if (!this._instance) {
      // Queue the callback for when we're initialized
      this._pendingMessageSubscriptions.push(callback);
      
      // Return a function that removes from the pending queue
      return () => {
        const index = this._pendingMessageSubscriptions.indexOf(callback);
        if (index !== -1) {
          this._pendingMessageSubscriptions.splice(index, 1);
        }
      };
    }
    return this._instance.onMessageReceived(callback);
  }
}

const messageManager = new DefaultMessageManager();

// Initialize in the background
messageManager.initialize().catch(error => {
  console.error('Failed to initialize default MessageManager:', error);
});

export default messageManager;
