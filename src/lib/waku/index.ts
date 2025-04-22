//TODO: perhaps store all messages in an indexed DB? (helpful when Waku is down)
// with a `isPublished` flag to indicate if the message has been sent to the network

import { createDecoder, createLightNode, HealthStatus, HealthStatusChangeEvents, LightNode } from "@waku/sdk";
import { BOOTSTRAP_NODES } from "./constants";
import StoreManager from "./store";
import { CommentCache, MessageType, VoteCache } from "./types";
import { PostCache } from "./types";
import { CellCache } from "./types";
import { OpchanMessage } from "@/types";
import { EphemeralProtocolsManager } from "./lightpush_filter";
import { NETWORK_CONFIG } from "./constants";

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
    } = {
        cells: {},
        posts: {},
        comments: {},
        votes: {}
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
            this._isReady = isReady;
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
            this.updateCache(message);
        }

        return messages;
    }

    public async sendMessage(message: OpchanMessage) {
        await this.ephemeralProtocolsManager.sendMessage(message);
        //TODO: should we update the cache here? or just from store/filter?
        this.updateCache(message);
    }

    public async subscribeToMessages(types: MessageType[] = [MessageType.CELL, MessageType.POST, MessageType.COMMENT, MessageType.VOTE]) {
        const { result, subscription } = await this.ephemeralProtocolsManager.subscribeToMessages(types);
        
        for (const message of result) {
            this.updateCache(message);
        }
        
        return { messages: result, subscription };
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
            default:
                // TypeScript should ensure we don't reach this case with proper OpchanMessage types
                console.warn("Received message with unknown type");
                break;
        }
    }
}

// Create singleton instance
const messageManager = await MessageManager.create();
export default messageManager;
