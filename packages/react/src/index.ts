// Providers only (context hooks are internal)
export * from './provider/OpChanProvider';
export { ClientProvider, useClient } from './contexts/ClientContext';
export { AuthProvider, useAuth } from './contexts/AuthContext';
export { ForumProvider, useForum as useForumContext } from './contexts/ForumContext';
export { ModerationProvider, useModeration } from './contexts/ModerationContext';

// Public hooks and types
export * from './hooks';
export { useForumApi as useForum } from './hooks/useForum';

// Re-export core types for convenience
export type {
  User,
  EVerificationStatus,
  EDisplayPreference,
  DelegationDuration,
  Cell,
  Post,
  Comment,
  Bookmark,
  BookmarkType,
  RelevanceScoreDetails,
} from '@opchan/core';


