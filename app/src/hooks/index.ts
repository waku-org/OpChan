// Core hooks - Re-exported from @opchan/react
export {
  useForumData,
  useAuth,
  useUserDisplay,
  useBookmarks,
  usePostBookmark,
  useCommentBookmark,
} from '@opchan/react';

// Core types - Re-exported from @opchan/react
export type {
  ForumData,
  CellWithStats,
  PostWithVoteStatus,
  CommentWithVoteStatus,
  Permission,
  PermissionReasons,
  PermissionResult,
  UserDisplayInfo,
} from '@opchan/react';

// Derived hooks - Re-exported from @opchan/react
export { useCell, usePost } from '@opchan/react';
export type { CellData, PostData } from '@opchan/react';

// Derived hooks - Re-exported from @opchan/react
export { useCellPosts, usePostComments, useUserVotes } from '@opchan/react';
export type {
  CellPostsOptions,
  CellPostsData,
  PostCommentsOptions,
  PostCommentsData,
  UserVoteData,
} from '@opchan/react';

// Action hooks - Re-exported from @opchan/react
export { useForumActions, useUserActions, useAuthActions } from '@opchan/react';
export type {
  ForumActionStates,
  ForumActions,
  UserActionStates,
  UserActions,
  AuthActionStates,
  AuthActions,
} from '@opchan/react';

// Utility hooks - Re-exported from @opchan/react
export {
  usePermissions,
  useNetworkStatus,
  useForumSelectors,
  useDelegation,
  useMessageSigning,
  usePending,
  usePendingVote,
  useWallet,
} from '@opchan/react';
export type {
  NetworkHealth,
  SyncStatus,
  ConnectionStatus,
  NetworkStatusData,
  ForumSelectors,
} from '@opchan/react';

// Legacy hooks (for backward compatibility - will be removed)
// export { useForum } from '@/contexts/useForum'; // Use useForumData instead
// export { useAuth as useLegacyAuth } from '@/contexts/useAuth'; // Use enhanced useAuth instead

// Re-export existing hooks that don't need changes (UI-specific)
export { useIsMobile as useMobile } from './use-mobile';
export { useToast } from './use-toast';

// Waku health hooks - Re-exported from @opchan/react
export {
  useWakuHealth,
  useWakuReady,
  useWakuHealthStatus,
} from '@opchan/react';
