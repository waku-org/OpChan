import { createDecoder, createLightNode, HealthStatus, HealthStatusChangeEvents, LightNode } from "@waku/sdk";
import { BOOTSTRAP_NODES } from "./constants";
import StoreManager from "./store";
import { CommentCache, MessageType, VoteCache, ModerateMessage } from "./types";
import { PostCache } from "./types";
import { CellCache } from "./types";
import { OpchanMessage } from "@/types";
import { EphemeralProtocolsManager } from "./lightpush_filter";
import { NETWORK_CONFIG } from "./constants";
import { db } from "../storage/db";

export type HealthChangeCallback = (isReady: boolean) => void;

class MessageManager {
    private node: LightNode;
    //TODO: implement SDS?
    private ephemeralProtocolsManager: EphemeralProtocolsManager;
    private storeManager: StoreManager;
    private _isReady: boolean = false;
    private healthListeners: Set<HealthChangeCallback> = new Set();
    private peerCheckInterval: NodeJS.Timeout | null = null;


    public readonly messageCache: {
        cells: CellCache;
        posts: PostCache;
        comments: CommentCache;
        votes: VoteCache;
        moderations: { [targetId: string]: ModerateMessage };
    } = {
        cells: {},
        posts: {},
        comments: {},
        votes: {},
        moderations: {}
    }

    public static async create(): Promise<MessageManager> {
        const node = await createLightNode({
            defaultBootstrap: false,
            networkConfig: NETWORK_CONFIG,
            autoStart: true,
            bootstrapPeers: BOOTSTRAP_NODES[42],
        });
        
        return new MessageManager(node);
    }

    public async stop() {
        if (this.peerCheckInterval) {
            clearInterval(this.peerCheckInterval);
            this.peerCheckInterval = null;
        }
        await this.node.stop();
        this.setIsReady(false);
    }

    private constructor(node: LightNode) {
        this.node = node;
        this.ephemeralProtocolsManager = new EphemeralProtocolsManager(node);
        this.storeManager = new StoreManager(node);
        
        // Start peer monitoring
        this.startPeerMonitoring();
    }

    /**
     * Start monitoring connected peers to determine node health
     * Runs every 1 second to check if we have at least one peer
     */
    private startPeerMonitoring() {
        // Initial peer check
        this.checkPeers();
        
        // Regular peer checking
        this.peerCheckInterval = setInterval(() => {
            this.checkPeers();
        }, 1000);
    }
    
    /**
     * Check if we have connected peers and update ready state
     */
    private async checkPeers() {
        try {
            const peers = await this.node.getConnectedPeers();
            this.setIsReady(peers.length >= 1);
        } catch (err) {
            console.error("Error checking peers:", err);
            this.setIsReady(false);
        }
    }

    private setIsReady(isReady: boolean) {
        if (this._isReady !== isReady) {
            const wasOffline = !this._isReady;
            this._isReady = isReady;
            
            // If we just came back online, sync the outbox
            if (isReady && wasOffline) {
                this.syncOutbox().catch(err => 
                    console.warn("Failed to sync outbox after coming online:", err)
                );
            }
            
            // Notify all health listeners
            this.healthListeners.forEach(listener => listener(isReady));
        }
    }

    /**
     * Returns whether the node is currently healthy and ready for use
     */
    public get isReady(): boolean {
        return this._isReady;
    }

    /**
     * Subscribe to health status changes
     * @param callback Function to call when health status changes
     * @returns Function to unsubscribe
     */
    public onHealthChange(callback: HealthChangeCallback): () => void {
        this.healthListeners.add(callback);
        
        // Immediately call with current status
        callback(this._isReady);
        
        // Return unsubscribe function
        return () => {
            this.healthListeners.delete(callback);
        };
    }

    /**
     * Waits for the node to connect to at least one peer
     * @param timeoutMs Maximum time to wait in milliseconds
     * @returns Promise that resolves when connected or rejects on timeout
     */
    public async waitForRemotePeer(timeoutMs: number = 15000): Promise<boolean> {
        if (this._isReady) return true;
        
        return new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timed out waiting for remote peer after ${timeoutMs}ms`));
            }, timeoutMs);
            
            const checkHandler = (isReady: boolean) => {
                if (isReady) {
                    clearTimeout(timeout);
                    this.healthListeners.delete(checkHandler);
                    resolve(true);
                }
            };
            
            // Add temporary listener for peer connection
            this.healthListeners.add(checkHandler);
            
            // Also do an immediate check in case we already have peers
            this.checkPeers();
        });
    }

    public async queryStore() {
        const messages = await this.storeManager.queryStore();
        
        for (const message of messages) {
            console.log("message", message);
            this.updateCache(message);
        }

        return messages;
    }

    public async sendMessage(message: OpchanMessage) {
        if (this._isReady) {
            // If we're online, send the message immediately
            await this.ephemeralProtocolsManager.sendMessage(message);
            this.updateCache(message);
        } else {
            // If we're offline, add to outbox
            await db.addToOutbox(message);
            // Still update cache for immediate UI feedback
            this.updateCache(message);
        }
    }

    public async subscribeToMessages(types: MessageType[] = [MessageType.CELL, MessageType.POST, MessageType.COMMENT, MessageType.VOTE, MessageType.MODERATE]) {
        const { result, subscription } = await this.ephemeralProtocolsManager.subscribeToMessages(types);
        
        for (const message of result) {
            this.updateCache(message);
        }
        
        return { messages: result, subscription };
    }

    private async updateCache(message: OpchanMessage) {
        switch (message.type) {
            case MessageType.CELL: {
                // Check for conflicts and resolve by timestamp (newer wins)
                const existingCell = this.messageCache.cells[message.id];
                if (!existingCell || message.timestamp >= existingCell.timestamp) {
                    this.messageCache.cells[message.id] = message;
                    await db.cells.put(message).catch(err => console.warn("Failed to persist cell to IndexedDB:", err));
                }
                break;
            }
            case MessageType.POST: {
                // Check for conflicts and resolve by timestamp (newer wins)
                const existingPost = this.messageCache.posts[message.id];
                if (!existingPost || message.timestamp >= existingPost.timestamp) {
                    this.messageCache.posts[message.id] = message;
                    await db.posts.put(message).catch(err => console.warn("Failed to persist post to IndexedDB:", err));
                }
                break;
            }
            case MessageType.COMMENT: {
                // Check for conflicts and resolve by timestamp (newer wins)
                const existingComment = this.messageCache.comments[message.id];
                if (!existingComment || message.timestamp >= existingComment.timestamp) {
                    this.messageCache.comments[message.id] = message;
                    await db.comments.put(message).catch(err => console.warn("Failed to persist comment to IndexedDB:", err));
                }
                break;
            }
            case MessageType.VOTE: {
                // For votes, we use a composite key of targetId + author to handle multiple votes from same user
                const voteKey = `${message.targetId}:${message.author}`;
                const existingVote = this.messageCache.votes[voteKey];
                if (!existingVote || message.timestamp >= existingVote.timestamp) {
                    this.messageCache.votes[voteKey] = message;
                    await db.votes.put(message).catch(err => console.warn("Failed to persist vote to IndexedDB:", err));
                }
                break;
            }
            case MessageType.MODERATE: {
                // Type guard for ModerateMessage
                const modMsg = message as ModerateMessage;
                const existingModeration = this.messageCache.moderations[modMsg.targetId];
                if (!existingModeration || modMsg.timestamp >= existingModeration.timestamp) {
                    this.messageCache.moderations[modMsg.targetId] = modMsg;
                    await db.moderations.put(modMsg).catch(err => console.warn("Failed to persist moderation to IndexedDB:", err));
                }
                break;
            }
            default:
                // TypeScript should ensure we don't reach this case with proper OpchanMessage types
                console.warn("Received message with unknown type");
                break;
        }
    }

    /**
     * Hydrate the message cache from IndexedDB on startup
     * This allows the UI to display cached data immediately
     */
    public async hydrateFromStorage(): Promise<void> {
        try {
            const cachedData = await db.hydrateMessageCache();
            this.messageCache.cells = cachedData.cells;
            this.messageCache.posts = cachedData.posts;
            this.messageCache.comments = cachedData.comments;
            this.messageCache.votes = cachedData.votes;
            this.messageCache.moderations = cachedData.moderations;
            console.log("Message cache hydrated from IndexedDB");
        } catch (err) {
            console.warn("Failed to hydrate message cache from IndexedDB:", err);
        }
    }

    /**
     * Sync the outbox - send all unpublished messages
     * Called automatically when coming back online
     */
    private async syncOutbox(): Promise<void> {
        try {
            const unpublishedMessages = await db.getUnpublishedMessages();
            console.log(`Syncing ${unpublishedMessages.length} messages from outbox`);
            
            for (const outboxItem of unpublishedMessages) {
                try {
                    // Send the message via Waku
                    await this.ephemeralProtocolsManager.sendMessage(outboxItem.data);
                    
                    // Mark as published in the database
                    await db.markAsPublished(outboxItem.id);
                    
                    console.log(`Successfully synced message ${outboxItem.id}`);
                } catch (err) {
                    console.warn(`Failed to sync message ${outboxItem.id}:`, err);
                    // Don't mark as published if sending failed
                }
            }
            
            // Clean up published messages from outbox
            await db.clearOutbox();
        } catch (err) {
            console.warn("Failed to sync outbox:", err);
        }
    }

    /**
     * Get the count of pending messages in the outbox
     */
    public async getOutboxCount(): Promise<number> {
        try {
            return await db.getOutboxCount();
        } catch (err) {
            console.warn("Failed to get outbox count:", err);
            return 0;
        }
    }
}

const messageManager = await MessageManager.create();
export default messageManager;
