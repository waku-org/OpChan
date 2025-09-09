import { ReliableChannel, ReliableChannelEvent, } from '@waku/sdk';
import { CodecManager } from '../CodecManager';
import { generateStringId } from '../../utils';
export class ReliableMessaging {
    constructor(node) {
        this.channel = null;
        this.messageCallbacks = new Map();
        this.incomingMessageCallbacks = new Set();
        this.codecManager = new CodecManager(node);
        this.initializeChannel(node);
    }
    async initializeChannel(node) {
        const encoder = this.codecManager.getEncoder();
        const decoder = this.codecManager.getDecoder();
        const senderId = generateStringId();
        const channelId = 'opchan-messages';
        try {
            this.channel = await ReliableChannel.create(node, channelId, senderId, encoder, decoder);
            this.setupChannelListeners(this.channel);
        }
        catch (error) {
            console.error('Failed to create reliable channel:', error);
        }
    }
    setupChannelListeners(channel) {
        channel.addEventListener(ReliableChannelEvent.InMessageReceived, (event) => {
            try {
                const wakuMessage = event.detail;
                if (wakuMessage.payload) {
                    const opchanMessage = this.codecManager.decodeMessage(wakuMessage.payload);
                    this.incomingMessageCallbacks.forEach((callback) => callback(opchanMessage));
                }
            }
            catch (error) {
                console.error('Failed to process incoming message:', error);
            }
        });
        channel.addEventListener(ReliableChannelEvent.OutMessageSent, (event) => {
            const messageId = event.detail;
            this.messageCallbacks.get(messageId)?.onSent?.(messageId);
        });
        channel.addEventListener(ReliableChannelEvent.OutMessageAcknowledged, (event) => {
            const messageId = event.detail;
            this.messageCallbacks.get(messageId)?.onAcknowledged?.(messageId);
        });
        channel.addEventListener(ReliableChannelEvent.OutMessageIrrecoverableError, (event) => {
            const messageId = event.detail.messageId;
            const error = event.detail.error;
            const callback = this.messageCallbacks.get(messageId);
            if (callback?.onError) {
                callback.onError(messageId, error?.toString() || 'Unknown error');
            }
            this.messageCallbacks.delete(messageId);
        });
    }
    async sendMessage(message, statusCallback) {
        if (!this.channel) {
            throw new Error('Reliable channel not initialized');
        }
        const encodedMessage = this.codecManager.encodeMessage(message);
        const messageId = ReliableChannel.getMessageId(encodedMessage);
        if (statusCallback) {
            this.messageCallbacks.set(messageId, statusCallback);
        }
        try {
            return this.channel.send(encodedMessage);
        }
        catch (error) {
            this.messageCallbacks.delete(messageId);
            throw error;
        }
    }
    onMessage(callback) {
        this.incomingMessageCallbacks.add(callback);
        return () => this.incomingMessageCallbacks.delete(callback);
    }
    cleanup() {
        this.messageCallbacks.clear();
        this.incomingMessageCallbacks.clear();
        this.channel = null;
    }
}
//# sourceMappingURL=ReliableMessaging.js.map