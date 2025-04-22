import { Cell, Post, Comment } from '@/types';

export interface ForumContextType {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  // Granular loading states
  isInitialLoading: boolean;
  isPostingCell: boolean;
  isPostingPost: boolean;
  isPostingComment: boolean;
  isVoting: boolean;
  isRefreshing: boolean;
  // Network status
  isNetworkConnected: boolean;
  error: string | null;
  getCellById: (id: string) => Cell | undefined;
  getPostsByCell: (cellId: string) => Post[];
  getCommentsByPost: (postId: string) => Comment[];
  createPost: (cellId: string, title: string, content: string) => Promise<Post | null>;
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  createCell: (name: string, description: string, icon: string) => Promise<Cell | null>;
  refreshData: () => Promise<void>;
} 