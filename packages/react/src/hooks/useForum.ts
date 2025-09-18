import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForum as useForumContext } from '../contexts/ForumContext';
import { usePermissions } from './core/usePermissions';
import { useForumData } from './core/useForumData';
import { useNetworkStatus } from './utilities/useNetworkStatus';
import { useBookmarks } from './core/useBookmarks';
import { useForumActions } from './actions/useForumActions';
import { useUserActions } from './actions/useUserActions';
import { useDelegation } from './utilities/useDelegation';
import { useMessageSigning } from './utilities/useMessageSigning';
import { useForumSelectors } from './utilities/useForumSelectors';
import { localDatabase } from '@opchan/core';

import type {
  Cell,
  Comment,
  Post,
  Bookmark,
  DelegationDuration,
  EDisplayPreference,
  EVerificationStatus,
  OpchanMessage,
} from '@opchan/core';
import type {
  CellWithStats,
  CommentWithVoteStatus,
  ForumData,
  PostWithVoteStatus,
} from './core/useForumData';
import type { Permission } from './core/usePermissions';

export interface UseForumApi {
  user: {
    isConnected: boolean;
    address?: string;
    walletType?: 'bitcoin' | 'ethereum';
    ensName?: string | null;
    ordinalDetails?: { ordinalId: string } | null;
    verificationStatus: EVerificationStatus;
    delegation: {
      hasDelegation: boolean;
      isValid: boolean;
      timeRemaining?: number;
      expiresAt?: Date;
      publicKey?: string;
    };
    profile: {
      callSign: string | null;
      displayPreference: EDisplayPreference | null;
    };
    connect: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    verifyOwnership: () => Promise<boolean>;
    delegateKey: (duration?: DelegationDuration) => Promise<boolean>;
    clearDelegation: () => Promise<void>;
    updateProfile: (updates: {
      callSign?: string;
      displayPreference?: EDisplayPreference;
    }) => Promise<boolean>;
    signMessage: (msg: OpchanMessage) => Promise<void>;
    verifyMessage: (msg: OpchanMessage) => Promise<boolean>;
  };
  content: {
    cells: Cell[];
    posts: Post[];
    comments: Comment[];
    bookmarks: Bookmark[];
    postsByCell: Record<string, PostWithVoteStatus[]>;
    commentsByPost: Record<string, CommentWithVoteStatus[]>;
    filtered: {
      cells: CellWithStats[];
      posts: PostWithVoteStatus[];
      comments: CommentWithVoteStatus[];
    };
    createCell: (input: {
      name: string;
      description: string;
      icon?: string;
    }) => Promise<Cell | null>;
    createPost: (input: {
      cellId: string;
      title: string;
      content: string;
    }) => Promise<Post | null>;
    createComment: (input: { postId: string; content: string }) => Promise<
      Comment | null
    >;
    vote: (input: { targetId: string; isUpvote: boolean }) => Promise<boolean>;
    moderate: {
      post: (
        cellId: string,
        postId: string,
        reason?: string
      ) => Promise<boolean>;
      unpost: (
        cellId: string,
        postId: string,
        reason?: string
      ) => Promise<boolean>;
      comment: (
        cellId: string,
        commentId: string,
        reason?: string
      ) => Promise<boolean>;
      uncomment: (
        cellId: string,
        commentId: string,
        reason?: string
      ) => Promise<boolean>;
      user: (
        cellId: string,
        userAddress: string,
        reason?: string
      ) => Promise<boolean>;
      unuser: (
        cellId: string,
        userAddress: string,
        reason?: string
      ) => Promise<boolean>;
    };
    togglePostBookmark: (post: Post, cellId?: string) => Promise<boolean>;
    toggleCommentBookmark: (
      comment: Comment,
      postId?: string
    ) => Promise<boolean>;
    refresh: () => Promise<void>;
    pending: {
      isPending: (id?: string) => boolean;
      isVotePending: (targetId?: string) => boolean;
      onChange: (cb: () => void) => () => void;
    };
  };
  permissions: {
    canPost: boolean;
    canComment: boolean;
    canVote: boolean;
    canCreateCell: boolean;
    canDelegate: boolean;
    canModerate: (cellId: string) => boolean;
    reasons: {
      vote: string;
      post: string;
      comment: string;
      createCell: string;
      moderate: (cellId: string) => string;
    };
    check: (
      action:
        | 'canPost'
        | 'canComment'
        | 'canVote'
        | 'canCreateCell'
        | 'canDelegate'
        | 'canModerate',
      cellId?: string
    ) => { allowed: boolean; reason: string };
  };
  network: {
    isConnected: boolean;
    statusColor: 'green' | 'yellow' | 'red';
    statusMessage: string;
    issues: string[];
    canRefresh: boolean;
    canSync: boolean;
    needsAttention: boolean;
    refresh: () => Promise<void>;
    recommendedActions: string[];
  };
  selectors: ReturnType<typeof useForumSelectors>;
}

export function useForumApi(): UseForumApi {
  const { currentUser, verificationStatus, connectWallet, disconnectWallet, verifyOwnership } = useAuth();
  const {
    refreshData,
  } = useForumContext();

  const forumData: ForumData = useForumData();
  const permissions = usePermissions();
  const network = useNetworkStatus();
  const { bookmarks, bookmarkPost, bookmarkComment } = useBookmarks();
  const forumActions = useForumActions();
  const userActions = useUserActions();
  const { delegationStatus, createDelegation, clearDelegation } = useDelegation();
  const { signMessage, verifyMessage } = useMessageSigning();

  const selectors = useForumSelectors(forumData);

  type MaybeOrdinal = { ordinalId?: unknown } | null | undefined;
  const toOrdinal = (value: MaybeOrdinal): { ordinalId: string } | null => {
    if (value && typeof value === 'object' && typeof (value as { ordinalId?: unknown }).ordinalId === 'string') {
      return { ordinalId: (value as { ordinalId: string }).ordinalId };
    }
    return null;
  };

  const user = useMemo(() => {
    return {
      isConnected: Boolean(currentUser),
      address: currentUser?.address,
      walletType: currentUser?.walletType,
      ensName: currentUser?.ensDetails?.ensName ?? null,
      ordinalDetails: toOrdinal((currentUser as unknown as { ordinalDetails?: MaybeOrdinal } | null | undefined)?.ordinalDetails),
      verificationStatus: verificationStatus,
      delegation: {
        hasDelegation: delegationStatus.hasDelegation,
        isValid: delegationStatus.isValid,
        timeRemaining: delegationStatus.timeRemaining,
        expiresAt: delegationStatus.expiresAt,
        publicKey: delegationStatus.publicKey,
      },
      profile: {
        callSign: currentUser?.callSign ?? null,
        displayPreference: currentUser?.displayPreference ?? null,
      },
      connect: async () => connectWallet(),
      disconnect: async () => { disconnectWallet(); },
      verifyOwnership: async () => verifyOwnership(),
      delegateKey: async (duration?: DelegationDuration) => createDelegation(duration),
      clearDelegation: async () => { await clearDelegation(); },
      updateProfile: async (updates: { callSign?: string; displayPreference?: EDisplayPreference }) => {
        return userActions.updateProfile(updates);
      },
      signMessage,
      verifyMessage,
    };
  }, [currentUser, verificationStatus, delegationStatus, connectWallet, disconnectWallet, verifyOwnership, createDelegation, clearDelegation, signMessage, verifyMessage]);

  const content = useMemo(() => {
    return {
      cells: forumData.cells,
      posts: forumData.posts,
      comments: forumData.comments,
      bookmarks,
      postsByCell: forumData.postsByCell,
      commentsByPost: forumData.commentsByPost,
      filtered: {
        cells: forumData.filteredCellsWithStats,
        posts: forumData.filteredPosts,
        comments: forumData.filteredComments,
      },
      createCell: async (input: { name: string; description: string; icon?: string }) => {
        return forumActions.createCell(input.name, input.description, input.icon);
      },
      createPost: async (input: { cellId: string; title: string; content: string }) => {
        return forumActions.createPost(input.cellId, input.title, input.content);
      },
      createComment: async (input: { postId: string; content: string }) => {
        return forumActions.createComment(input.postId, input.content);
      },
      vote: async (input: { targetId: string; isUpvote: boolean }) => {
        // useForumActions.vote handles both posts and comments by id
        if (!input.targetId) return false;
        // Try post vote first, then comment vote if needed
        try {
          const ok = await forumActions.votePost(input.targetId, input.isUpvote);
          if (ok) return true;
        } catch {}
        try {
          return await forumActions.voteComment(input.targetId, input.isUpvote);
        } catch {
          return false;
        }
      },
      moderate: {
        post: async (cellId: string, postId: string, reason?: string) => {
          try { return await forumActions.moderatePost(cellId, postId, reason); } catch { return false; }
        },
        unpost: async (cellId: string, postId: string, reason?: string) => {
          try { return await forumActions.unmoderatePost(cellId, postId, reason); } catch { return false; }
        },
        comment: async (cellId: string, commentId: string, reason?: string) => {
          try { return await forumActions.moderateComment(cellId, commentId, reason); } catch { return false; }
        },
        uncomment: async (cellId: string, commentId: string, reason?: string) => {
          try { return await forumActions.unmoderateComment(cellId, commentId, reason); } catch { return false; }
        },
        user: async (cellId: string, userAddress: string, reason?: string) => {
          try { return await forumActions.moderateUser(cellId, userAddress, reason); } catch { return false; }
        },
        unuser: async (cellId: string, userAddress: string, reason?: string) => {
          try { return await forumActions.unmoderateUser(cellId, userAddress, reason); } catch { return false; }
        },
      },
      togglePostBookmark: async (post: Post, cellId?: string) => bookmarkPost(post, cellId),
      toggleCommentBookmark: async (comment: Comment, postId?: string) => bookmarkComment(comment, postId),
      refresh: async () => { await refreshData(); },
      pending: {
        isPending: (id?: string) => {
          return id ? localDatabase.isPending(id) : false;
        },
        isVotePending: (targetId?: string) => {
          if (!targetId || !currentUser?.address) return false;
          return Object.values(localDatabase.cache.votes).some(v => {
            return (
              v.targetId === targetId &&
              v.author === currentUser.address &&
              localDatabase.isPending(v.id)
            );
          });
        },
        onChange: (cb: () => void) => {
          return localDatabase.onPendingChange(cb);
        },
      },
    };
  }, [forumData, bookmarks, forumActions, bookmarkPost, bookmarkComment, refreshData, currentUser?.address]);

  const permissionsSlice = useMemo(() => {
    return {
      canPost: permissions.canPost,
      canComment: permissions.canComment,
      canVote: permissions.canVote,
      canCreateCell: permissions.canCreateCell,
      canDelegate: permissions.canDelegate,
      canModerate: permissions.canModerate,
      reasons: {
        vote: permissions.voteReason,
        post: permissions.postReason,
        comment: permissions.commentReason,
        createCell: permissions.createCellReason,
        moderate: permissions.moderateReason,
      },
      check: (action: keyof Permission, cellId?: string) => {
        return permissions.checkPermission(action, cellId);
      },
    };
  }, [permissions]);

  const networkSlice = useMemo(() => {
    return {
      isConnected: network.health.isConnected,
      statusColor: network.getHealthColor(),
      statusMessage: network.getStatusMessage(),
      issues: network.health.issues,
      canRefresh: network.canRefresh,
      canSync: network.canSync,
      needsAttention: network.needsAttention,
      refresh: async () => { await forumData && content.refresh(); },
      recommendedActions: network.getRecommendedActions(),
    };
  }, [
    network.health.isConnected,
    network.health.isHealthy,
    network.health.issues,
    network.canRefresh,
    network.canSync,
    network.needsAttention,
    forumData,
    content
  ]);

  return useMemo(() => ({
    user,
    content,
    permissions: permissionsSlice,
    network: networkSlice,
    selectors,
  }), [user, content, permissionsSlice, networkSlice, selectors]);
}


