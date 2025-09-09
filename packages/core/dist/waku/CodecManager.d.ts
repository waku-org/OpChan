import { IDecodedMessage, IDecoder, IEncoder, LightNode } from '@waku/sdk';
import { MessageType } from '../types/waku';
import { OpchanMessage } from '../types/forum';
export declare class CodecManager {
    private node;
    private encoder;
    private decoder;
    constructor(node: LightNode);
    /**
     * Encode a message for transmission
     */
    encodeMessage(message: OpchanMessage): Uint8Array;
    /**
     * Decode a received message
     */
    decodeMessage(payload: Uint8Array): OpchanMessage;
    /**
     * Get the single encoder for all message types
     */
    getEncoder(): IEncoder;
    /**
     * Get the single decoder for all message types
     */
    getDecoder(): IDecoder<IDecodedMessage>;
    /**
     * Get all decoders (returns single decoder in array for compatibility)
     */
    getAllDecoders(): IDecoder<IDecodedMessage>[];
    /**
     * Get decoders for specific message types (returns single decoder for all types)
     */
    getDecoders(_messageTypes: MessageType[]): IDecoder<IDecodedMessage>[];
}
//# sourceMappingURL=CodecManager.d.ts.map