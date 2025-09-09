import { OpchanMessage } from '../../types/forum';
import { ReliableMessaging, MessageStatusCallback } from '../core/ReliableMessaging';
import { WakuNodeManager } from '../core/WakuNodeManager';
export type MessageReceivedCallback = (message: OpchanMessage) => void;
export type { MessageStatusCallback };
export declare class MessageService {
    private reliableMessaging;
    private nodeManager;
    private messageReceivedCallbacks;
    constructor(reliableMessaging: ReliableMessaging | null, nodeManager: WakuNodeManager);
    private setupMessageHandling;
    sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<{
        success: boolean;
        message?: OpchanMessage;
        error?: string;
    }>;
    onMessageReceived(callback: MessageReceivedCallback): () => void;
    updateReliableMessaging(reliableMessaging: ReliableMessaging | null): void;
    get messageCache(): import("../../database/LocalDatabase").LocalDatabaseCache;
    cleanup(): void;
}
//# sourceMappingURL=MessageService.d.ts.map