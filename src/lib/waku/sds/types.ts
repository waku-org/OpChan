import { OpchanMessage } from "../../types";

export interface SDSMetadata {
  channelId: string;
  lamportTimestamp: number;
  causalHistory: string[];
  bloomFilter?: Uint8Array;
}

export interface SDSEnhancedMessage extends OpchanMessage {
  sds?: SDSMetadata;
}

export interface SDSChannelState {
  channelId: string;
  lamportTimestamp: number;
  messageHistory: string[];
  lastSync: number;
}