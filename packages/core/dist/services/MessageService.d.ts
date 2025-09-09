import { OpchanMessage } from '../types/forum';
import { UnsignedMessage } from '../types/waku';
import { DelegationManager } from '../delegation';
export interface MessageResult {
    success: boolean;
    message?: OpchanMessage;
    error?: string;
}
export interface MessageServiceInterface {
    sendMessage(message: UnsignedMessage): Promise<MessageResult>;
    verifyMessage(message: OpchanMessage): Promise<boolean>;
    signAndBroadcastMessage(message: UnsignedMessage): Promise<OpchanMessage | null>;
}
export declare class MessageService implements MessageServiceInterface {
    private delegationManager;
    constructor(delegationManager: DelegationManager);
    /**
     * Sign and send a message to the Waku network
     */
    sendMessage(message: UnsignedMessage): Promise<MessageResult>;
    /**
     * Sign and broadcast a message (simplified version for profile updates)
     */
    signAndBroadcastMessage(message: UnsignedMessage): Promise<OpchanMessage | null>;
    /**
     * Verify a message signature
     */
    verifyMessage(message: OpchanMessage): Promise<boolean>;
}
//# sourceMappingURL=MessageService.d.ts.map