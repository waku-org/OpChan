
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
  content: string;
  timestamp: number;
  upvotes: string[];
  downvotes: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorAddress: string;
  content: string;
  timestamp: number;
  upvotes: string[];
  downvotes: string[];
}
