import { createEncoder, createDecoder } from "@waku/sdk";
import { SDSEnhancedMessage, SDSChannelState } from "./types";
import { OpchanMessage } from "../../types";

// For now, use a single channel for all votes to test SDS
const VOTE_CHANNEL_ID = "opchan:votes:all";
const SDS_CONTENT_TOPIC = "/opchan/1/sds-votes/proto";

export class MinimalSDSWrapper {
  private channelStates: Map<string, SDSChannelState> = new Map();
  private encoder = createEncoder({ contentTopic: SDS_CONTENT_TOPIC });
  private decoder = createDecoder(SDS_CONTENT_TOPIC);

  constructor() {
    // Initialize vote channel
    this.channelStates.set(VOTE_CHANNEL_ID, {
      channelId: VOTE_CHANNEL_ID,
      lamportTimestamp: 0,
      messageHistory: [],
      lastSync: Date.now()
    });
  }

  // Enhance a message with SDS metadata
  enhanceMessage(message: OpchanMessage): SDSEnhancedMessage {
    // Only enhance vote messages for minimal implementation
    if (message.type !== 'vote') {
      return message;
    }

    const state = this.channelStates.get(VOTE_CHANNEL_ID)!;
    
    // Increment Lamport timestamp
    state.lamportTimestamp++;
    
    // Get last 3 message IDs for causal history
    const causalHistory = state.messageHistory.slice(-3);
    
    // Add current message to history
    state.messageHistory.push(message.id);
    if (state.messageHistory.length > 100) {
      state.messageHistory = state.messageHistory.slice(-100);
    }

    return {
      ...message,
      sds: {
        channelId: VOTE_CHANNEL_ID,
        lamportTimestamp: state.lamportTimestamp,
        causalHistory
      }
    };
  }

  // Process incoming message with SDS metadata
  processIncomingMessage(message: SDSEnhancedMessage): void {
    if (!message.sds || message.type !== 'vote') {
      return;
    }

    const state = this.channelStates.get(VOTE_CHANNEL_ID)!;
    
    // Update Lamport timestamp (max of local and received + 1)
    state.lamportTimestamp = Math.max(
      state.lamportTimestamp, 
      message.sds.lamportTimestamp
    ) + 1;

    // Add to message history if not already present
    if (!state.messageHistory.includes(message.id)) {
      state.messageHistory.push(message.id);
      if (state.messageHistory.length > 100) {
        state.messageHistory = state.messageHistory.slice(-100);
      }
    }
  }

  // Check if message A is causally newer than B
  isCausallyNewer(a: SDSEnhancedMessage, b: SDSEnhancedMessage): boolean {
    if (!a.sds || !b.sds) {
      return a.timestamp > b.timestamp;
    }
    
    // First check Lamport timestamps
    if (a.sds.lamportTimestamp !== b.sds.lamportTimestamp) {
      return a.sds.lamportTimestamp > b.sds.lamportTimestamp;
    }
    
    // If equal, use message ID as tiebreaker
    return a.id > b.id;
  }

  // Get encoder/decoder for SDS messages
  getEncoder() {
    return this.encoder;
  }

  getDecoder() {
    return this.decoder;
  }
}