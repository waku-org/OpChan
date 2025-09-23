// Public hooks surface: aggregator and focused derived hooks
// Aggregator hook (main API)
export { useForumApi } from './useForum';

// Core hooks (complex logic)
export { useForumData } from './core/useForumData';
export { usePermissions } from './core/usePermissions';
export { useUserDisplay } from './core/useUserDisplay';
export { useIdentity } from './useIdentity';

// Derived hooks (data slicing utilities)
export { useCell } from './derived/useCell';
export { usePost } from './derived/usePost';
export { useCellPosts } from './derived/useCellPosts';
export { usePostComments } from './derived/usePostComments';
export { useUserVotes } from './derived/useUserVotes';

// Utility hooks (remaining complex logic)
export { useWallet } from './utilities/useWallet';
export { useNetworkStatus } from './utilities/useNetworkStatus';
export { useForumSelectors } from './utilities/useForumSelectors';
export { useBookmarks, usePostBookmark, useCommentBookmark } from './utilities/useBookmarks';

// Export types
export type {
  ForumData,
  CellWithStats,
  PostWithVoteStatus,
  CommentWithVoteStatus,
} from './core/useForumData';

export type {
  Permission,
  PermissionReasons,
  PermissionResult,
} from './core/usePermissions';

export type { UserDisplayInfo } from './core/useUserDisplay';

// Removed types from deleted action hooks - functionality now in useForumApi

export type { CellData } from './derived/useCell';
export type { PostData } from './derived/usePost';
export type { CellPostsOptions, CellPostsData } from './derived/useCellPosts';
export type { PostCommentsOptions, PostCommentsData } from './derived/usePostComments';
export type { UserVoteData } from './derived/useUserVotes';

// Utility types
export type {
  NetworkHealth,
  SyncStatus,
  ConnectionStatus,
  NetworkStatusData,
} from './utilities/useNetworkStatus';
export type { ForumSelectors } from './utilities/useForumSelectors';

// Remove duplicate re-exports


