import { CellMessage, CommentMessage, PostMessage, VoteMessage, ModerateMessage } from "@/lib/waku/types";
import { RelevanceScoreDetails } from "@/lib/forum/relevance";

export type OpchanMessage = CellMessage | PostMessage | CommentMessage | VoteMessage | ModerateMessage;

export interface User {
  address: string; 
  walletType: 'bitcoin' | 'ethereum'; 

  // Bitcoin-specific
  ordinalOwnership?: boolean | { id: string; details: string };
  
  // Ethereum-specific
  ensName?: string;
  ensAvatar?: string;
  ensOwnership?: boolean;
  
  verificationStatus: 'unverified' | 'verified-none' | 'verified-owner' | 'verifying';
  
  signature?: string;
  lastChecked?: number;
  browserPubKey?: string; // Browser-generated public key for key delegation
  delegationSignature?: string; // Signature from Bitcoin/Ethereum wallet for delegation
  delegationExpiry?: number; // When the delegation expires
}

export interface Cell {
  id: string;
  name: string;
  description: string;
  icon?: string;
  signature?: string; // Message signature
  browserPubKey?: string; // Public key that signed the message
  relevanceScore?: number; // Calculated relevance score
  activeMemberCount?: number; // Number of active members in the cell
  relevanceDetails?: RelevanceScoreDetails; // Detailed breakdown of relevance score calculation
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
  relevanceScore?: number; // Calculated relevance score
  verifiedUpvotes?: number; // Count of upvotes from verified users
  verifiedCommenters?: string[]; // List of verified users who commented
  relevanceDetails?: RelevanceScoreDetails; // Detailed breakdown of relevance score calculation
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
  relevanceScore?: number; // Calculated relevance score
  relevanceDetails?: RelevanceScoreDetails; // Detailed breakdown of relevance score calculation
}
