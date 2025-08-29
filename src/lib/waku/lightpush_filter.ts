import { LightNode } from "@waku/sdk";
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage, ModerateMessage } from "./types";
import { OpchanMessage } from "@/types/forum";
import { encodeMessage, encoders, decoders, decodeMessage } from "./codec";

export class EphemeralProtocolsManager {
    private node: LightNode;

    constructor(node: LightNode) {
        this.node = node;
    }

    public async sendMessage(message: OpchanMessage) {
        const encodedMessage = encodeMessage(message);
        const result = await this.node.lightPush.send(encoders[message.type], {
            payload: encodedMessage
        });
        return result;
    }

    public async subscribeToMessages(types: MessageType[]) {
        const result: (CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage)[] = [];

        const subscription = await this.node.filter.subscribe(Object.values(decoders), async (message) => {
            const {payload} = message;

            const decodedMessage = decodeMessage(payload);
            if (types.includes(decodedMessage.type)) {
                result.push(decodedMessage);
            }
        });

        if (subscription.error) {
            throw new Error(subscription.error);
        }

        if (subscription.results.successes.length === 0) {
            throw new Error("No successes");
        }

        return {result, subscription};
    }
}