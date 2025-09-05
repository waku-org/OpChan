// Core hooks - Main exports
export { useForumData } from './core/useForumData';
export { useAuth } from './core/useAuth';
export { useUserDisplay } from './core/useUserDisplay';
export {
  useBookmarks,
  usePostBookmark,
  useCommentBookmark,
} from './core/useBookmarks';

// Core types
export type {
  ForumData,
  CellWithStats,
  PostWithVoteStatus,
  CommentWithVoteStatus,
} from './core/useForumData';

export type { AuthState } from './core/useAuth';
export type {
  Permission,
  PermissionReasons,
  PermissionResult,
} from './core/usePermissions';

export type { UserDisplayInfo } from './core/useEnhancedUserDisplay';

// Derived hooks
export { useCell } from './derived/useCell';
export type { CellData } from './derived/useCell';

export { usePost } from './derived/usePost';
export type { PostData } from './derived/usePost';

export { useCellPosts } from './derived/useCellPosts';
export type { CellPostsOptions, CellPostsData } from './derived/useCellPosts';

export { usePostComments } from './derived/usePostComments';
export type {
  PostCommentsOptions,
  PostCommentsData,
} from './derived/usePostComments';

export { useUserVotes } from './derived/useUserVotes';
export type { UserVoteData } from './derived/useUserVotes';

// Action hooks
export { useForumActions } from './actions/useForumActions';
export type {
  ForumActionStates,
  ForumActions,
} from './actions/useForumActions';

export { useUserActions } from './actions/useUserActions';
export type { UserActionStates, UserActions } from './actions/useUserActions';

export { useAuthActions } from './actions/useAuthActions';
export type { AuthActionStates, AuthActions } from './actions/useAuthActions';

// Utility hooks
export { usePermissions } from './core/usePermissions';

export { useNetworkStatus } from './utilities/useNetworkStatus';
export type {
  NetworkHealth,
  SyncStatus,
  ConnectionStatus,
  NetworkStatusData,
} from './utilities/useNetworkStatus';

export {
  useWakuHealth,
  useWakuReady,
  useWakuHealthStatus,
} from './useWakuHealth';
export type { WakuHealthState } from './useWakuHealth';

export { useForumSelectors } from './utilities/selectors';
export type { ForumSelectors } from './utilities/selectors';

// Legacy hooks (for backward compatibility - will be removed)
// export { useForum } from '@/contexts/useForum'; // Use useForumData instead
// export { useAuth as useLegacyAuth } from '@/contexts/useAuth'; // Use enhanced useAuth instead

// Re-export existing hooks that don't need changes
export { useIsMobile as useMobile } from './use-mobile';
export { useToast } from './use-toast';
// export { useCache } from './useCache'; // Removed - functionality moved to useForumData
export { useDelegation } from './useDelegation';
export { useMessageSigning } from './useMessageSigning';
export { useWallet } from './useWallet';
