import { LightNode } from "@waku/sdk";
import { decodeCellMessage, decodeCommentMessage, decodePostMessage, decoders, decodeVoteMessage, encodeMessage, encoders } from "./codec";
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage } from "./types";
import { CONTENT_TOPICS } from "./constants";
import { OpchanMessage } from "@/types";

export class EphemeralProtocolsManager {
    private node: LightNode;

    constructor(node: LightNode) {
        this.node = node;
    }

    public async sendMessage(message: OpchanMessage) {
        const encodedMessage = encodeMessage(message);
        await this.node.lightPush.send(encoders[message.type], {
            payload: encodedMessage
        });
    }

    public async subscribeToMessages(types: MessageType[]) {
        const result: (CellMessage | PostMessage | CommentMessage | VoteMessage)[] = [];

        const subscription = await this.node.filter.subscribe(Object.values(decoders), async (message) => {
            const {contentTopic, payload} = message;
            const toDecode = [
                types.includes(MessageType.CELL) ? decodeCellMessage(payload) : null,
                types.includes(MessageType.POST) ? decodePostMessage(payload) : null,
                types.includes(MessageType.COMMENT) ? decodeCommentMessage(payload) : null,
                types.includes(MessageType.VOTE) ? decodeVoteMessage(payload) : null
            ]
            const decodedMessage = await Promise.race(toDecode);

            let parsedMessage: OpchanMessage | null = null;
            switch(contentTopic) {
                case CONTENT_TOPICS['cell']:
                    parsedMessage = decodedMessage as CellMessage;
                    break;
                case CONTENT_TOPICS['post']:
                    parsedMessage = decodedMessage as PostMessage;
                    break;
                case CONTENT_TOPICS['comment']:
                    parsedMessage = decodedMessage as CommentMessage;
                    break;
                case CONTENT_TOPICS['vote']:
                    parsedMessage = decodedMessage as VoteMessage;
                    break;
                default:
                    console.error(`Unknown content topic: ${contentTopic}`);
                    return;
            }

            if (parsedMessage) {
                result.push(parsedMessage);
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