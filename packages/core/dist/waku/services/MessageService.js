import { localDatabase } from '../../database/LocalDatabase';
export class MessageService {
    constructor(reliableMessaging, nodeManager) {
        this.reliableMessaging = reliableMessaging;
        this.nodeManager = nodeManager;
        this.messageReceivedCallbacks = new Set();
        this.setupMessageHandling();
    }
    setupMessageHandling() {
        if (this.reliableMessaging) {
            this.reliableMessaging.onMessage(async (message) => {
                localDatabase.setSyncing(true);
                const isNew = await localDatabase.updateCache(message);
                // Defensive: clear pending on inbound message to avoid stuck state
                localDatabase.clearPending(message.id);
                localDatabase.setSyncing(false);
                if (isNew)
                    this.messageReceivedCallbacks.forEach((cb) => cb(message));
            });
        }
    }
    async sendMessage(message, statusCallback) {
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
                onSent: (id) => {
                    console.log(`Message ${id} sent`);
                    statusCallback?.onSent?.(id);
                },
                onAcknowledged: (id) => {
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
        }
        catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    onMessageReceived(callback) {
        this.messageReceivedCallbacks.add(callback);
        return () => this.messageReceivedCallbacks.delete(callback);
    }
    updateReliableMessaging(reliableMessaging) {
        this.reliableMessaging = reliableMessaging;
        this.setupMessageHandling();
    }
    get messageCache() {
        return localDatabase.cache;
    }
    cleanup() {
        this.messageReceivedCallbacks.clear();
        this.reliableMessaging?.cleanup();
    }
}
//# sourceMappingURL=MessageService.js.map