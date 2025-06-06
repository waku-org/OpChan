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
  // contentTopics: Object.values(CONTENT_TOPICS),
  clusterId: 42,
  shards: [0]
}

/**
 * Bootstrap nodes for the Waku network
 * These are public Waku nodes that our node will connect to on startup
 */
export const BOOTSTRAP_NODES = {
  "42": [
    "/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ",
    "/dns4/node-01.do-ams3.waku.sandbox.status.im/tcp/30303/p2p/16Uiu2HAmNaeL4p3WEYzC9mgXBmBWSgWjPHRvatZTXnp8Jgv3iKsb",
    "/dns4/vps-aaa00d52.vps.ovh.ca/tcp/8000/wss/p2p/16Uiu2HAm9PftGgHZwWE3wzdMde4m3kT2eYJFXLZfGoSED3gysofk"
    ],
  };

  export const LOCAL_STORAGE_KEYS = {
    "KEY_DELEGATION": "opchan-key-delegation",
  }