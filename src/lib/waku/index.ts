import { createDecoder, createLightNode, LightNode } from "@waku/sdk";
import { BOOTSTRAP_NODES } from "./constants";
import StoreManager from "./store";
import { CommentCache, MessageType, VoteCache } from "./types";
import { PostCache } from "./types";
import { CellCache } from "./types";
import { OpchanMessage } from "@/types";
import { EphemeralProtocolsManager } from "./lightpush_filter";
import { NETWORK_CONFIG } from "./constants";

class MessageManager {
    private node: LightNode;
    //TODO: implement SDS?
    private ephemeralProtocolsManager: EphemeralProtocolsManager;
    private storeManager: StoreManager;


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
            lightPush:{autoRetry: true, retryIntervalMs: 1000}
        });
        return new MessageManager(node);
    }

    public async stop() {
        await this.node.stop();
    }

    private constructor(node: LightNode) {
        this.node = node;
        this.ephemeralProtocolsManager = new EphemeralProtocolsManager(node);
        this.storeManager = new StoreManager(node);
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

const messageManager = await MessageManager.create();
export default messageManager;
