import { HealthStatus } from '@waku/sdk';
import { WakuNodeManager } from './core/WakuNodeManager';
import { MessageService, } from './services/MessageService';
import { ReliableMessaging } from './core/ReliableMessaging';
class MessageManager {
    constructor() {
        this.nodeManager = null;
        // LocalDatabase eliminates the need for CacheService
        this.messageService = null;
        this.reliableMessaging = null;
    }
    static async create() {
        const manager = new MessageManager();
        await manager.initialize();
        return manager;
    }
    async initialize() {
        try {
            this.nodeManager = await WakuNodeManager.create();
            // Now create message service with proper dependencies
            this.messageService = new MessageService(this.reliableMessaging, this.nodeManager);
            // Set up health-based reliable messaging initialization
            this.nodeManager.onHealthChange((isReady) => {
                if (isReady && !this.reliableMessaging) {
                    this.initializeReliableMessaging();
                }
                else if (!isReady && this.reliableMessaging) {
                    this.cleanupReliableMessaging();
                }
            });
        }
        catch (error) {
            console.error('Failed to initialize MessageManager:', error);
            throw error;
        }
    }
    async initializeReliableMessaging() {
        if (!this.nodeManager || this.reliableMessaging) {
            return;
        }
        try {
            console.log('Initializing reliable messaging...');
            this.reliableMessaging = new ReliableMessaging(this.nodeManager.getNode());
            this.messageService?.updateReliableMessaging(this.reliableMessaging);
            console.log('Reliable messaging initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize reliable messaging:', error);
        }
    }
    cleanupReliableMessaging() {
        if (this.reliableMessaging) {
            console.log('Cleaning up reliable messaging due to health status');
            this.reliableMessaging.cleanup();
            this.reliableMessaging = null;
            this.messageService?.updateReliableMessaging(null);
        }
    }
    async stop() {
        this.cleanupReliableMessaging();
        this.messageService?.cleanup();
        await this.nodeManager?.stop();
    }
    get isReady() {
        return this.nodeManager?.isReady ?? false;
    }
    get currentHealth() {
        return this.nodeManager?.currentHealth ?? HealthStatus.Unhealthy;
    }
    onHealthChange(callback) {
        if (!this.nodeManager) {
            throw new Error('Node manager not initialized');
        }
        return this.nodeManager.onHealthChange(callback);
    }
    //TODO: return event handlers?
    async sendMessage(message, statusCallback) {
        if (!this.messageService) {
            throw new Error('MessageManager not fully initialized');
        }
        this.messageService.sendMessage(message, statusCallback);
    }
    onMessageReceived(callback) {
        if (!this.messageService) {
            throw new Error('MessageManager not fully initialized');
        }
        return this.messageService.onMessageReceived(callback);
    }
    get messageCache() {
        if (!this.messageService) {
            throw new Error('MessageManager not fully initialized');
        }
        return this.messageService.messageCache;
    }
}
const messageManager = await MessageManager.create();
export default messageManager;
//# sourceMappingURL=index.js.map