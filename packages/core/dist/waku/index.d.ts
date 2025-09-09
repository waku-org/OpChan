import { HealthStatus } from '@waku/sdk';
import { OpchanMessage } from '../types/forum';
import { HealthChangeCallback } from './core/WakuNodeManager';
import { MessageStatusCallback } from './services/MessageService';
export type { HealthChangeCallback, MessageStatusCallback };
declare class MessageManager {
    private nodeManager;
    private messageService;
    private reliableMessaging;
    constructor();
    static create(): Promise<MessageManager>;
    private initialize;
    private initializeReliableMessaging;
    private cleanupReliableMessaging;
    stop(): Promise<void>;
    get isReady(): boolean;
    get currentHealth(): HealthStatus;
    onHealthChange(callback: HealthChangeCallback): () => void;
    sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<void>;
    onMessageReceived(callback: (message: OpchanMessage) => void): () => void;
    get messageCache(): import("../database/LocalDatabase").LocalDatabaseCache;
}
declare const messageManager: MessageManager;
export default messageManager;
//# sourceMappingURL=index.d.ts.map