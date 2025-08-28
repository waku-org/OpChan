import { IDecodedMessage, LightNode } from "@waku/sdk";
import {  decodeMessage, decoders} from "./codec";
import { CellMessage, PostMessage, CommentMessage, VoteMessage } from "./types";

class StoreManager {
    private node: LightNode;

    constructor(node: LightNode) {
        this.node = node;
    }

    public async queryStore() {
        const result: (CellMessage | PostMessage | CommentMessage | VoteMessage)[] = [];

        try {
            // Add query options to prevent database overload
            const queryOptions = {
                paginationLimit: 50,    // Correct parameter name for page size
                timeStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                timeEnd: new Date(),    // Current time
                paginationForward: false, // false = newest first
                includeData: true       // Include full message data
            };

            // Try with query options first, fallback to no options if it fails
            try {
                await this.node.store.queryWithOrderedCallback(
                    Object.values(decoders),
                    (message: IDecodedMessage) => {
                        const { payload } = message;
                        const decodedMessage = decodeMessage(payload);
                        result.push(decodedMessage);
                    },
                    queryOptions
                );
            } catch (queryError) {
                console.warn("Query with options failed, trying without options:", queryError);
                // Fallback: query without options but add manual limit
                let messageCount = 0;
                const MAX_MESSAGES = 100;

                await this.node.store.queryWithOrderedCallback(
                    Object.values(decoders),
                    (message: IDecodedMessage) => {
                        if (messageCount >= MAX_MESSAGES) {
                            return;
                        }

                        const { payload } = message;
                        const decodedMessage = decodeMessage(payload);
                        result.push(decodedMessage);
                        messageCount++;
                    }
                );
            }

            if (result.length > 0) {
                console.log(`Store query completed. Found ${result.length} messages`);
            }
        } catch (error) {
            console.error("Store query failed:", error);
            throw error;
        }
        
        return result;
    }
}

export default StoreManager;