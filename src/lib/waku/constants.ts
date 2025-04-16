import { MessageType } from "./types";
import type { QueryRequestParams } from '@waku/sdk'

/**
 * Content topics for different message types
 */
export const CONTENT_TOPICS: Record<MessageType, string> = {
  [MessageType.CELL]: '/opchan/1/cell/proto',
  [MessageType.POST]: '/opchan/1/post/proto',
  [MessageType.COMMENT]: '/opchan/1/comment/proto',
  [MessageType.VOTE]: '/opchan/1/vote/proto'
};

/**
 * Bootstrap nodes for the Waku network
 * These are public Waku nodes that our node will connect to on startup
 */
export const BOOTSTRAP_NODES = [
  '/dns4/node-01.ac-cn-hongkong-c.wakuv2.test.statusim.net/tcp/443/wss/p2p/16Uiu2HAkykgaECHswi3YKJ5dMLbq2kPVCo89fcyTd2Hz8tHPeV4y',
  '/dns4/node-01.do-ams3.wakuv2.test.statusim.net/tcp/443/wss/p2p/16Uiu2HAmPLe7Mzm8TsYUubgCAW1aJoeFScxrLj8ppHFivPo97bUZ',
  '/dns4/node-01.gc-us-central1-a.wakuv2.test.statusim.net/tcp/443/wss/p2p/16Uiu2HAmJb2e28qLXxT5kZxVUUoJt72EMzNGXB47Rxx5hw3q4YjS'
];

// Default store query options
// export const DEFAULT_STORE_QUERY_OPTIONS: QueryRequestParams  = {
//   contentTopics: [CONTENT_TOPICS[MessageType.CELL], CONTENT_TOPICS[MessageType.POST], CONTENT_TOPICS[MessageType.COMMENT], CONTENT_TOPICS[MessageType.VOTE]],
//   includeData: true, 
//   paginationForward: false,
//   pubsubTopic:  ""
// }; 