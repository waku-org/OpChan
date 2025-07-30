import { CellMessage, CommentMessage, PostMessage, VoteMessage, ModerateMessage } from "@/lib/waku/types";

export type OpchanMessage = CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage;

export interface User {
  address: string;
  ordinalOwnership?: boolean | { id: string; details: string };
  signature?: string;
  lastChecked?: number;
  browserPubKey?: string; // Browser-generated public key for key delegation
  delegationSignature?: string; // Signature from Bitcoin wallet for delegation
  delegationExpiry?: number; // When the delegation expires
}

export interface Cell {
  id: string;
  name: string;
  description: string;
  icon?: string;
  signature?: string; // Message signature
  browserPubKey?: string; // Public key that signed the message
}

export interface Post {
  id: string;
  cellId: string;
  authorAddress: string;
  title: string;
  content: string;
  timestamp: number;
  upvotes: VoteMessage[];
  downvotes: VoteMessage[];
  signature?: string; // Message signature
  browserPubKey?: string; // Public key that signed the message
  moderated?: boolean;
  moderatedBy?: string;
  moderationReason?: string;
  moderationTimestamp?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorAddress: string;
  content: string;
  timestamp: number;
  upvotes: VoteMessage[];
  downvotes: VoteMessage[];
  signature?: string; // Message signature
  browserPubKey?: string; // Public key that signed the message
  moderated?: boolean;
  moderatedBy?: string;
  moderationReason?: string;
  moderationTimestamp?: number;
}

// Extended message types for verification
export interface SignedMessage {
  signature?: string; // Signature of the message
  browserPubKey?: string; // Public key that signed the message
}
