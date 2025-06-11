import { CellMessage, CommentMessage, PostMessage, VoteMessage, ModerateMessage } from "@/lib/waku/types";

export interface SDSMetadata {
  channelId: string;
  lamportTimestamp: number;
  causalHistory: string[];
  bloomFilter?: Uint8Array;
}

export type SDSEnhancedMessage = 
  | CellMessage
  | PostMessage
  | CommentMessage
  | (VoteMessage & { sds?: SDSMetadata })
  | ModerateMessage;

export interface SDSChannelState {
  channelId: string;
  lamportTimestamp: number;
  messageHistory: string[];
  lastSync: number;
}