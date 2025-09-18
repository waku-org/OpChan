// Public hooks surface: aggregator and focused derived hooks
// Aggregator hook
export { useForumApi } from './useForum';

// Core hooks
export { useForumData } from './core/useForumData';
export { usePermissions } from './core/usePermissions';
export { useUserDisplay } from './core/useUserDisplay';
export { useBookmarks, usePostBookmark, useCommentBookmark } from './core/useBookmarks';

// Action hooks
export { useForumActions } from './actions/useForumActions';
export { useAuthActions } from './actions/useAuthActions';
export { useUserActions } from './actions/useUserActions';

// Derived hooks
export { useCell } from './derived/useCell';
export { usePost } from './derived/usePost';
export { useCellPosts } from './derived/useCellPosts';
export { usePostComments } from './derived/usePostComments';
export { useUserVotes } from './derived/useUserVotes';

// Utility hooks
export { useWakuHealth, useWakuReady, useWakuHealthStatus } from './utilities/useWakuHealth';
export { useDelegation } from './utilities/useDelegation';
export { useMessageSigning } from './utilities/useMessageSigning';
export { usePending, usePendingVote } from './utilities/usePending';
export { useWallet } from './utilities/useWallet';
export { useNetworkStatus } from './utilities/useNetworkStatus';
export { useForumSelectors } from './utilities/useForumSelectors';

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

export type {
  ForumActionStates,
  ForumActions,
} from './actions/useForumActions';

export type {
  AuthActionStates,
  AuthActions,
} from './actions/useAuthActions';

export type {
  UserActionStates,
  UserActions,
} from './actions/useUserActions';

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


