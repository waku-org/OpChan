import { LightNode } from '@waku/sdk';
import { OpchanMessage } from '../../types/forum';
export interface MessageStatusCallback {
    onSent?: (messageId: string) => void;
    onAcknowledged?: (messageId: string) => void;
    onError?: (messageId: string, error: string) => void;
}
export type IncomingMessageCallback = (message: OpchanMessage) => void;
export declare class ReliableMessaging {
    private channel;
    private messageCallbacks;
    private incomingMessageCallbacks;
    private codecManager;
    constructor(node: LightNode);
    private initializeChannel;
    private setupChannelListeners;
    sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<void>;
    onMessage(callback: IncomingMessageCallback): () => void;
    cleanup(): void;
}
//# sourceMappingURL=ReliableMessaging.d.ts.map