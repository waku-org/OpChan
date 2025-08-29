import { MessageType } from "../../types/waku";

/**
 * Content topics for different message types
 */
export const CONTENT_TOPICS: Record<MessageType, string> = {
  [MessageType.CELL]: '/opchan-sds/1/cell/proto',
  [MessageType.POST]: '/opchan-sds/1/post/proto',
  [MessageType.COMMENT]: '/opchan-sds/1/comment/proto',
  [MessageType.VOTE]: '/opchan-sds/1/vote/proto',
  [MessageType.MODERATE]: '/opchan-sds/1/moderate/proto'
};

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