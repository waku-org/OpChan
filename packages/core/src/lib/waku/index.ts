import { HealthStatus } from '@waku/sdk';
import { OpchanMessage } from '../../types/forum';
import { WakuNodeManager, HealthChangeCallback } from './core/WakuNodeManager';
import {
  MessageService,
  MessageStatusCallback,
} from './services/MessageService';
import { ReliableMessaging, SyncStatusCallback } from './core/ReliableMessaging';
import { WakuConfig } from '../../types';

export type { HealthChangeCallback, MessageStatusCallback, SyncStatusCallback };

class MessageManager {
  private nodeManager: WakuNodeManager | null = null;
  private messageService: MessageService | null = null;
  private reliableMessaging: ReliableMessaging | null = null;
  private wakuConfig: WakuConfig;

  constructor(wakuConfig: WakuConfig) {
    this.wakuConfig = wakuConfig;
  }

  // ===== PUBLIC STATIC METHODS =====

  public static async create(wakuConfig: WakuConfig): Promise<MessageManager> {
    const manager = new MessageManager(wakuConfig);
    await manager.initialize();
    return manager;
  }

  // ===== PUBLIC INSTANCE METHODS =====

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

  public onSyncStatus(callback: SyncStatusCallback): () => void {
    if (!this.reliableMessaging) {
      throw new Error('Reliable messaging not initialized');
    }
    return this.reliableMessaging.onSyncStatus(callback);
  }

  // ===== PRIVATE METHODS =====

  private async initialize(): Promise<void> {
    try {
      this.nodeManager = await WakuNodeManager.create();

      // Now create message service with proper dependencies
      this.messageService = new MessageService(
        this.reliableMessaging,
        this.nodeManager
      );

      // Set up health-based reliable messaging initialization
      this.nodeManager.onHealthChange(async (isReady) => {
        if (isReady && !this.reliableMessaging) {
          await this.initializeReliableMessaging();
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
        this.nodeManager.getNode(),
        this.wakuConfig
      );
      this.messageService?.updateReliableMessaging(this.reliableMessaging);
      console.log('Reliable messaging initialized successfully');
    } catch (error) {
      console.error('Failed to initialize reliable messaging:', error);
    }
  }

  public getReliableMessaging(): ReliableMessaging | null {
    return this.reliableMessaging;
  }

  private cleanupReliableMessaging(): void {
    if (this.reliableMessaging) {
      console.log('Cleaning up reliable messaging due to health status');
      this.reliableMessaging.cleanup();
      this.reliableMessaging = null;
      this.messageService?.updateReliableMessaging(null);
    }
  }
}

// Create a default instance that can be used synchronously but initialized asynchronously
export class DefaultMessageManager {
  private _instance: MessageManager | null = null;
  private _initPromise: Promise<MessageManager> | null = null;
  private _pendingHealthSubscriptions: HealthChangeCallback[] = [];
  private _pendingMessageSubscriptions: ((message: any) => void)[] = [];
  private _pendingSyncStatusSubscriptions: SyncStatusCallback[] = [];
  private _wakuConfig: WakuConfig | null = null;

  // ===== PUBLIC METHODS =====

  // Initialize the manager asynchronously
  async initialize(wakuConfig?: WakuConfig): Promise<void> {
    if (wakuConfig) {
      this._wakuConfig = wakuConfig;
    }
    
    if (!this._initPromise && this._wakuConfig) {
      this._initPromise = MessageManager.create(this._wakuConfig);
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
    
    // Establish all pending sync status subscriptions
    this._pendingSyncStatusSubscriptions.forEach(callback => {
      try {
        this._instance!.onSyncStatus(callback);
      } catch (e) {
        // Reliable messaging might not be ready yet, keep in pending
      }
    });
    
    // Set up a listener to retry sync subscriptions when reliable messaging becomes available
    const reliableMessaging = this._instance?.getReliableMessaging();
    if (!reliableMessaging) {
      // Watch for when it becomes available
      const checkInterval = setInterval(() => {
        const rm = this._instance?.getReliableMessaging();
        if (rm && this._pendingSyncStatusSubscriptions.length > 0) {
          this.retryPendingSyncSubscriptions();
          clearInterval(checkInterval);
        }
      }, 1000);
      
      // Clean up after 30 seconds
      setTimeout(() => clearInterval(checkInterval), 30000);
    }
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
      if (!this._wakuConfig) {
        throw new Error('WakuConfig must be provided before sending messages');
      }
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

  onSyncStatus(callback: SyncStatusCallback) {
    if (!this._instance) {
      // Queue the callback for when we're initialized
      this._pendingSyncStatusSubscriptions.push(callback);
      
      return () => {
        const index = this._pendingSyncStatusSubscriptions.indexOf(callback);
        if (index !== -1) {
          this._pendingSyncStatusSubscriptions.splice(index, 1);
        }
      };
    }
    try {
      return this._instance.onSyncStatus(callback);
    } catch (e) {
      // Reliable messaging not ready, queue it
      this._pendingSyncStatusSubscriptions.push(callback);
      return () => {
        const index = this._pendingSyncStatusSubscriptions.indexOf(callback);
        if (index !== -1) {
          this._pendingSyncStatusSubscriptions.splice(index, 1);
        }
      };
    }
  }

  // Helper to retry pending sync subscriptions when reliable messaging becomes available
  private retryPendingSyncSubscriptions() {
    if (!this._instance) return;
    
    const pending = [...this._pendingSyncStatusSubscriptions];
    this._pendingSyncStatusSubscriptions = [];
    
    pending.forEach(callback => {
      try {
        this._instance!.onSyncStatus(callback);
      } catch (e) {
        // Still not ready, put it back
        this._pendingSyncStatusSubscriptions.push(callback);
      }
    });
  }
}

const messageManager = new DefaultMessageManager();

export default messageManager;
