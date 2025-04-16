import { IDecodedMessage, LightNode } from "@waku/sdk";
import {  decoders, decodeCellMessage, decodePostMessage, decodeCommentMessage, decodeVoteMessage } from "./codec";
import { CONTENT_TOPICS } from "./constants";
import { CellMessage, PostMessage, CommentMessage, VoteMessage } from "./types";

class StoreManager {
    private node: LightNode;

    constructor(node: LightNode) {
        this.node = node;
    }

    public async queryStore() {
        const result: (CellMessage | PostMessage | CommentMessage | VoteMessage)[] = [];
        
        await this.node.store.queryWithOrderedCallback(
        Object.values(decoders),
        (message: IDecodedMessage) => {
            const {contentTopic, payload} = message;
            let parsedMessage: (CellMessage | PostMessage | CommentMessage | VoteMessage) | null = null;
            
            switch(contentTopic) {
                case CONTENT_TOPICS['cell']:
                    parsedMessage = decodeCellMessage(payload) as CellMessage;
                    break;
                case CONTENT_TOPICS['post']:
                    parsedMessage = decodePostMessage(payload) as PostMessage;
                    break;
                case CONTENT_TOPICS['comment']:
                    parsedMessage = decodeCommentMessage(payload) as CommentMessage;
                    break;
                case CONTENT_TOPICS['vote']:
                    parsedMessage = decodeVoteMessage(payload) as VoteMessage;
                    break;
                default:
                    console.error(`Unknown content topic: ${contentTopic}`);
                    return;
            }
            
            if (parsedMessage) {
                result.push(parsedMessage);
            }
        }
        );
        
        return result;
    }
}

export default StoreManager;