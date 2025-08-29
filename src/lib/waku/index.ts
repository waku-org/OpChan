//TODO: perhaps store all messages in an indexed DB? (helpful when Waku is down)
// with a `isPublished` flag to indicate if the message has been sent to the network

import  { createLightNode, LightNode, WakuEvent, HealthStatus } from "@waku/sdk";
import { CommentCache, MessageType, VoteCache, ModerateMessage } from "./types";
import { PostCache } from "./types";
import { CellCache } from "./types";
import { OpchanMessage } from "@/types/forum";
import { NETWORK_CONFIG } from "./constants";
import { ReliableMessageManager } from "./reliable_channel";

export type HealthChangeCallback = (isReady: boolean, health: HealthStatus) => void;

class MessageManager {
    private node: LightNode;
    private reliableMessageManager: ReliableMessageManager | null = null;
    private _isReady: boolean = false;
    private _currentHealth: HealthStatus = HealthStatus.Unhealthy;
    private healthListeners: Set<HealthChangeCallback> = new Set();


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
            defaultBootstrap: true,
            networkConfig: NETWORK_CONFIG,
            autoStart: true,
            // bootstrapPeers: BOOTSTRAP_NODES[42],
        });
        
        return new MessageManager(node);
    }

    public async stop() {
        if (this.reliableMessageManager) {
            this.reliableMessageManager.cleanup();
            this.reliableMessageManager = null;
        }
        
        await this.node.stop();
        this.setIsReady(false);
    }

    private constructor(node: LightNode) {
        this.node = node;
        this.setupHealthMonitoring();
    }

    /**
     * Set up health monitoring using Waku's built-in health events
     */
    private setupHealthMonitoring() {
        this.node.events.addEventListener(WakuEvent.Health, (event) => {
            const health = event.detail;
            this._currentHealth = health;
            
            console.log(`Waku health status: ${health}`);
            
            if (health === HealthStatus.SufficientlyHealthy) {
                console.log("Waku is sufficiently healthy - initializing reliable messaging");
                this.setIsReady(true);
                this.initializeReliableManager();
            } else if (health === HealthStatus.MinimallyHealthy) {
                console.log("Waku is minimally healthy - may have issues sending/receiving messages");
                this.setIsReady(true);
                this.initializeReliableManager();
            } else {
                console.log("Waku is unhealthy - disconnected from network");
                this.setIsReady(false);
                this.cleanupReliableManager();
            }
        });
    }

    private async initializeReliableManager() {
        // Only initialize if not already initialized
        if (this.reliableMessageManager) {
            return;
        }
        
        try {
            this.reliableMessageManager = new ReliableMessageManager(this.node);
            
            // Set up listener for incoming reliable messages
            this.reliableMessageManager.addIncomingMessageListener({
                onMessage: (message) => {
                    console.log("Received reliable message:", message);
                    this.updateCache(message);
                }
            });
            
            console.log("Reliable message manager initialized successfully");
        } catch (error) {
            console.error("Failed to initialize reliable message manager:", error);
        }
    }

    private cleanupReliableManager() {
        if (this.reliableMessageManager) {
            console.log("Cleaning up reliable message manager due to health status");
            this.reliableMessageManager.cleanup();
            this.reliableMessageManager = null;
        }
    }

    private setIsReady(isReady: boolean) {
        if (this._isReady !== isReady) {
            this._isReady = isReady;
            // Notify all health listeners with both ready state and health status
            this.healthListeners.forEach(listener => listener(isReady, this._currentHealth));
        }
    }

    /**
     * Returns whether the node is currently healthy and ready for use
     */
    public get isReady(): boolean {
        return this._isReady;
    }

    /**
     * Returns the current Waku health status
     */
    public get currentHealth(): HealthStatus {
        return this._currentHealth;
    }

    /**
     * Subscribe to health status changes
     * @param callback Function to call when health status changes
     * @returns Function to unsubscribe
     */
    public onHealthChange(callback: HealthChangeCallback): () => void {
        this.healthListeners.add(callback);
        
        // Immediately call with current status
        callback(this._isReady, this._currentHealth);
        
        // Return unsubscribe function
        return () => {
            this.healthListeners.delete(callback);
        };
    }

    /**
     * Waits for the node to achieve at least minimally healthy status
     * @param timeoutMs Maximum time to wait in milliseconds
     * @returns Promise that resolves when healthy or rejects on timeout
     */
    public async waitForRemotePeer(timeoutMs: number = 15000): Promise<boolean> {
        if (this._isReady) return true;
        
        return new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timed out waiting for healthy network connection after ${timeoutMs}ms`));
            }, timeoutMs);
            
            const checkHandler = (isReady: boolean, health: HealthStatus) => {
                if (isReady && (health === HealthStatus.MinimallyHealthy || health === HealthStatus.SufficientlyHealthy)) {
                    clearTimeout(timeout);
                    this.healthListeners.delete(checkHandler);
                    resolve(true);
                }
            };
            
            // Add temporary listener for health status
            this.healthListeners.add(checkHandler);
        });
    }

    public async sendMessage(message: OpchanMessage) {
        if (!this.reliableMessageManager) {
            throw new Error("Reliable message manager not initialized");
        }

        // Use reliable channel with status tracking
        const messageId = await this.reliableMessageManager.sendMessage(message, {
            onSent: (id) => console.log(`Message ${id} sent ✓`),
            onAcknowledged: (id) => console.log(`Message ${id} acknowledged ✓✓`),
            onError: (id, error) => console.error(`Message ${id} failed:`, error)
        });
        
        console.log(`Sent reliable message with ID: ${messageId}`);
        
        // Update local cache immediately for optimistic UI
        this.updateCache(message);
        
        return messageId;
    }

    private updateCache(message: OpchanMessage) {
        switch (message.type) {
            case MessageType.CELL:
                this.messageCache.cells[message.id] = message;
                break;
            case MessageType.POST:
                this.messageCache.posts[message.id] = message;
                break;
            case MessageType.COMMENT:
                this.messageCache.comments[message.id] = message;
                break;
            case MessageType.VOTE: {
                // For votes, we use a composite key of targetId + author to handle multiple votes from same user
                const voteKey = `${message.targetId}:${message.author}`;
                this.messageCache.votes[voteKey] = message;
                break;
            }
            case MessageType.MODERATE: {
                // Type guard for ModerateMessage
                const modMsg = message as ModerateMessage;
                this.messageCache.moderations[modMsg.targetId] = modMsg;
                break;
            }
            default:
                // TypeScript should ensure we don't reach this case with proper OpchanMessage types
                console.warn("Received message with unknown type");
                break;
        }
    }
}

const messageManager = await MessageManager.create();
export default messageManager;
