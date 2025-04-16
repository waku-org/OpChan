import { CellMessage, CommentMessage, PostMessage, VoteMessage } from "@/lib/waku/types";

export type OpchanMessage = CellMessage | PostMessage | CommentMessage | VoteMessage;

export interface User {
  address: string;
  ordinalOwnership?: boolean | { id: string; details: string };
  signature?: string;
  lastChecked?: number;
}

export interface Cell {
  id: string;
  name: string;
  description: string;
  icon: string;
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
}

export interface Comment {
  id: string;
  postId: string;
  authorAddress: string;
  content: string;
  timestamp: number;
  upvotes: VoteMessage[];
  downvotes: VoteMessage[];
}
