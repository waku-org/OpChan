import { createEncoder, createDecoder } from "@waku/sdk";
import { SDSEnhancedMessage, SDSChannelState, SDSMetadata } from "./types";
import { CellMessage, CommentMessage, PostMessage, VoteMessage, ModerateMessage } from "@/lib/waku/types";

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
  enhanceMessage(message: CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage): SDSEnhancedMessage {
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

    // Return vote message with SDS metadata
    const voteMessage = message as VoteMessage;
    return {
      ...voteMessage,
      sds: {
        channelId: VOTE_CHANNEL_ID,
        lamportTimestamp: state.lamportTimestamp,
        causalHistory
      }
    };
  }

  // Process incoming message with SDS metadata
  processIncomingMessage(message: SDSEnhancedMessage): void {
    if (message.type !== 'vote' || !('sds' in message) || !message.sds) {
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
    // Type guard to check if message has SDS metadata
    const hasSDSMetadata = (msg: SDSEnhancedMessage): msg is VoteMessage & { sds: SDSMetadata } => {
      return msg.type === 'vote' && 'sds' in msg && msg.sds !== undefined;
    };

    if (!hasSDSMetadata(a) || !hasSDSMetadata(b)) {
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