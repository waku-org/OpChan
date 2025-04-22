import { IDecodedMessage, LightNode } from "@waku/sdk";
import {  decodeMessage, decoders} from "./codec";
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
            const { payload} = message;
            const decodedMessage = decodeMessage(payload);
            result.push(decodedMessage);
        }
        );

        
        return result;
    }
}

export default StoreManager;