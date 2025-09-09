import { MessageType } from '../types/waku';
import { CONTENT_TOPIC } from './constants';
export class CodecManager {
    constructor(node) {
        this.node = node;
        this.encoder = this.node.createEncoder({ contentTopic: CONTENT_TOPIC });
        this.decoder = this.node.createDecoder({ contentTopic: CONTENT_TOPIC });
    }
    /**
     * Encode a message for transmission
     */
    encodeMessage(message) {
        const messageJson = JSON.stringify(message);
        return new TextEncoder().encode(messageJson);
    }
    /**
     * Decode a received message
     */
    decodeMessage(payload) {
        const messageJson = new TextDecoder().decode(payload);
        const message = JSON.parse(messageJson);
        switch (message.type) {
            case MessageType.CELL:
                return message;
            case MessageType.POST:
                return message;
            case MessageType.COMMENT:
                return message;
            case MessageType.VOTE:
                return message;
            case MessageType.MODERATE:
                return message;
            case MessageType.USER_PROFILE_UPDATE:
                return message;
            default:
                throw new Error(`Unknown message type: ${message}`);
        }
    }
    /**
     * Get the single encoder for all message types
     */
    getEncoder() {
        return this.encoder;
    }
    /**
     * Get the single decoder for all message types
     */
    getDecoder() {
        return this.decoder;
    }
    /**
     * Get all decoders (returns single decoder in array for compatibility)
     */
    getAllDecoders() {
        return [this.decoder];
    }
    /**
     * Get decoders for specific message types (returns single decoder for all types)
     */
    getDecoders(_messageTypes) {
        return [this.decoder];
    }
}
//# sourceMappingURL=CodecManager.js.map