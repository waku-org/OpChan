import { IDecodedMessage, LightNode, ReliableChannel, ReliableChannelEvent } from "@waku/sdk";
import { MessageType } from "./types";
import { CodecManager } from "./codec";
import { generateStringId } from "@/lib/utils";
import { OpchanMessage } from "@/types/forum";

export interface MessageStatusCallback {
    onSent?: (messageId: string) => void;
    onAcknowledged?: (messageId: string) => void;
    onError?: (messageId: string, error: string) => void;
}

export interface IncomingMessageCallback {
    onMessage: (message: OpchanMessage) => void;
}

export class ReliableMessageManager {
    private channels: Map<MessageType, ReliableChannel<IDecodedMessage>> = new Map();
    private messageCallbacks: Map<string, MessageStatusCallback> = new Map();
    private incomingMessageCallbacks: IncomingMessageCallback[] = [];
    private codecManager: CodecManager;
    
    constructor(node: LightNode) {
        this.codecManager = new CodecManager(node);
        this.initializeChannels(node);
    }

    private async initializeChannels(node: LightNode) {
        for (const type of Object.values(MessageType)) {
            const encoder = this.codecManager.getEncoder(type);
            const decoder = this.codecManager.getDecoder(type);
            const senderId = generateStringId();
            const channelId = `opchan-${type}`;  // Unique channel ID for each message type
            
            try {
                const channel = await ReliableChannel.create(node, channelId, senderId, encoder, decoder);
                this.channels.set(type, channel);
                this.setupChannelListeners(channel, type);
            } catch (error) {
                console.error(`Failed to create reliable channel for ${type}:`, error);
            }
        }
    }

    private setupChannelListeners(channel: ReliableChannel<IDecodedMessage>, type: MessageType) {
        channel.addEventListener(ReliableChannelEvent.InMessageReceived, (event) => {
            try {
                const wakuMessage = event.detail;
                if (wakuMessage.payload) {
                    const opchanMessage = this.codecManager.decodeMessage(wakuMessage.payload);
                   
                 
                    this.incomingMessageCallbacks.forEach(callback => {
                        callback.onMessage(opchanMessage);
                    });
                }
            } catch (error) {
                console.error(`Failed to process incoming message for ${type}:`, error);
            }
        });

        // Listen for outgoing message status updates
        channel.addEventListener(ReliableChannelEvent.OutMessageSent, (event) => {
            const messageId = event.detail;
            const callback = this.messageCallbacks.get(messageId);
            if (callback?.onSent) {
                callback.onSent(messageId);
            }
        });

        channel.addEventListener(ReliableChannelEvent.OutMessageAcknowledged, (event) => {
            const messageId = event.detail;
            const callback = this.messageCallbacks.get(messageId);
            if (callback?.onAcknowledged) {
                callback.onAcknowledged(messageId);
            }
        });

        channel.addEventListener(ReliableChannelEvent.OutMessageIrrecoverableError, (event) => {
            const messageId = event.detail.messageId;
            const error = event.detail.error;
            const callback = this.messageCallbacks.get(messageId);
            if (callback?.onError) {
                callback.onError(messageId, error?.toString() || 'Unknown error');
            }
            // Clean up callback after error
            this.messageCallbacks.delete(messageId);
        });
    }

    public async sendMessage(message: OpchanMessage, statusCallback?: MessageStatusCallback): Promise<string> {
        const channel = this.channels.get(message.type);
        if (!channel) {
            throw new Error(`No reliable channel for message type: ${message.type}`);
        }

        const encodedMessage = this.codecManager.encodeMessage(message);
        const messageId = ReliableChannel.getMessageId(encodedMessage);

        // Store callback for this message
        if (statusCallback) {
            this.messageCallbacks.set(messageId, statusCallback);
        }

        try {
            await channel.send(encodedMessage);
            return messageId;
        } catch (error) {
            // Clean up callback on immediate send failure
            this.messageCallbacks.delete(messageId);
            throw error;
        }
    }

    public addIncomingMessageListener(callback: IncomingMessageCallback) {
        this.incomingMessageCallbacks.push(callback);
    }

    public removeIncomingMessageListener(callback: IncomingMessageCallback) {
        const index = this.incomingMessageCallbacks.indexOf(callback);
        if (index > -1) {
            this.incomingMessageCallbacks.splice(index, 1);
        }
    }

    public getChannelStatus(type: MessageType): boolean {
        return this.channels.has(type);
    }

    public cleanup() {
        this.messageCallbacks.clear();
        this.incomingMessageCallbacks.length = 0;
        this.channels.clear();
    }
}