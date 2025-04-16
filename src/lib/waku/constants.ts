import { NetworkConfig, ShardInfo } from "@waku/sdk";
import { MessageType } from "./types";

/**
 * Content topics for different message types
 */
export const CONTENT_TOPICS: Record<MessageType, string> = {
  [MessageType.CELL]: '/opchan/1/cell/proto',
  [MessageType.POST]: '/opchan/1/post/proto',
  [MessageType.COMMENT]: '/opchan/1/comment/proto',
  [MessageType.VOTE]: '/opchan/1/vote/proto'
};

export const NETWORK_CONFIG: NetworkConfig = {
  contentTopics: Object.values(CONTENT_TOPICS),
  shards: [1],
  clusterId: 42
}

/**
 * Bootstrap nodes for the Waku network
 * These are public Waku nodes that our node will connect to on startup
 */
export const BOOTSTRAP_NODES = [
];