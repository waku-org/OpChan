import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForum as useForumContext } from '../contexts/ForumContext';
import { useClient } from '../contexts/ClientContext';
import { usePermissions } from './core/usePermissions';
import { useForumData } from './core/useForumData';
import { useNetworkStatus } from './utilities/useNetworkStatus';
import { useForumSelectors } from './utilities/useForumSelectors';

import type {
  Cell,
  Comment,
  Post,
  Bookmark,
  User,
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
  const client = useClient();
  const { currentUser, verificationStatus, connectWallet, disconnectWallet, verifyOwnership } = useAuth();
  const {
    refreshData,
  } = useForumContext();

  const forumData: ForumData = useForumData();
  const permissions = usePermissions();
  const network = useNetworkStatus();
  const selectors = useForumSelectors(forumData);

  // Bookmarks state (moved from useBookmarks)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Delegation functionality (moved from useDelegation)
  const [delegationStatus, setDelegationStatus] = useState({
    hasDelegation: false,
    isValid: false,
    timeRemaining: 0,
    expiresAt: undefined as Date | undefined,
    publicKey: undefined as string | undefined,
  });

  // Update delegation status
  useEffect(() => {
    const updateStatus = async () => {
      if (currentUser) {
        const status = await client.delegation.getStatus(currentUser.address, currentUser.walletType);
        setDelegationStatus({
          hasDelegation: !!status,
          isValid: status?.isValid || false,
          timeRemaining: status?.timeRemaining || 0,
          expiresAt: status?.proof?.expiryTimestamp ? new Date(status.proof.expiryTimestamp) : undefined,
          publicKey: status?.publicKey,
        });
      }
    };
    updateStatus();
  }, [client.delegation, currentUser]);

  // Load bookmarks for current user
  useEffect(() => {
    const load = async () => {
      if (!currentUser?.address) {
        setBookmarks([]);
        return;
      }
      try {
        const list = await client.database.getUserBookmarks(currentUser.address);
        setBookmarks(list);
      } catch (e) {
        console.error('Failed to load bookmarks', e);
      }
    };
    load();
  }, [client.database, currentUser?.address]);

  const createDelegation = useCallback(async (duration?: DelegationDuration): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      // Use the delegate method from DelegationManager
      const signFunction = async (message: string) => {
        // This would need to be implemented based on your wallet signing approach
        // For now, return empty string - this needs proper wallet integration
        return '';
      };
      
      const success = await client.delegation.delegate(
        currentUser.address,
        currentUser.walletType,
        duration,
        signFunction
      );
      
      if (success) {
        // Update status after successful delegation
        const status = await client.delegation.getStatus(currentUser.address, currentUser.walletType);
        setDelegationStatus({
          hasDelegation: !!status,
          isValid: status?.isValid || false,
          timeRemaining: status?.timeRemaining || 0,
          expiresAt: status?.proof?.expiryTimestamp ? new Date(status.proof.expiryTimestamp) : undefined,
          publicKey: status?.publicKey,
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to create delegation:', error);
      return false;
    }
  }, [client.delegation, currentUser]);

  const clearDelegation = useCallback(async (): Promise<void> => {
    // Clear delegation storage using the database directly
    await client.database.clearDelegation();
    setDelegationStatus({
      hasDelegation: false,
      isValid: false,
      timeRemaining: 0,
      expiresAt: undefined,
      publicKey: undefined,
    });
  }, [client.database]);

  // Message signing functionality (moved from useMessageSigning)
  const signMessage = useCallback(async (message: OpchanMessage): Promise<void> => {
    if (!currentUser) {
      console.warn('No current user. Cannot sign message.');
      return;
    }
    const status = await client.delegation.getStatus(currentUser.address, currentUser.walletType);
    if (!status?.isValid) {
      console.warn('No valid delegation found. Cannot sign message.');
      return;
    }
    await client.messageManager.sendMessage(message);
  }, [client.delegation, client.messageManager, currentUser]);

  const verifyMessage = useCallback(async (message: OpchanMessage): Promise<boolean> => {
    try {
      // Use message service to verify message
      return await client.messageService.verifyMessage(message);
    } catch (error) {
      console.error('Failed to verify message:', error);
      return false;
    }
  }, [client.messageService]);

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
        if (!currentUser) {
          throw new Error('User identity service is not available.');
        }
        try {
          // Update user identity in database
          await client.database.upsertUserIdentity(currentUser.address, {
            ...(updates.callSign !== undefined ? { callSign: updates.callSign } : {}),
            ...(updates.displayPreference !== undefined ? { displayPreference: updates.displayPreference } : {}),
            lastUpdated: Date.now(),
          });
          
          // Update user lightweight record for displayPreference if present
          if (updates.displayPreference !== undefined) {
            const updatedUser: User = {
              address: currentUser.address,
              walletType: currentUser.walletType!,
              verificationStatus: currentUser.verificationStatus,
              displayPreference: updates.displayPreference,
              callSign: currentUser.callSign ?? undefined,
              ensDetails: currentUser.ensDetails ?? undefined,
              ordinalDetails: (currentUser as unknown as { ordinalDetails?: { ordinalId: string; ordinalDetails: string } | null }).ordinalDetails ?? undefined,
              lastChecked: Date.now(),
            };
            await client.database.storeUser(updatedUser);
          }
          return true;
        } catch (error) {
          console.error('Failed to update profile:', error);
          return false;
        }
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
        if (!permissions.canCreateCell) {
          throw new Error(permissions.createCellReason);
        }
        if (!input.name.trim() || !input.description.trim()) {
          throw new Error('Please provide both a name and description for the cell.');
        }
        try {
          const result = await client.forumActions.createCell(
            {
              name: input.name,
              description: input.description,
              icon: input.icon,
              currentUser,
              isAuthenticated: !!currentUser,
            },
            async () => { await refreshData(); }
          );
          return result.data || null;
        } catch {
          throw new Error('Failed to create cell. Please try again.');
        }
      },
      createPost: async (input: { cellId: string; title: string; content: string }) => {
        if (!permissions.canPost) {
          throw new Error('Connect your wallet to create posts.');
        }
        if (!input.title.trim() || !input.content.trim()) {
          throw new Error('Please provide both a title and content for the post.');
        }
        try {
          const result = await client.forumActions.createPost(
            {
              cellId: input.cellId,
              title: input.title,
              content: input.content,
              currentUser,
              isAuthenticated: !!currentUser,
            },
            async () => { await refreshData(); }
          );
          return result.data || null;
        } catch {
          throw new Error('Failed to create post. Please try again.');
        }
      },
      createComment: async (input: { postId: string; content: string }) => {
        if (!permissions.canComment) {
          throw new Error('You need to connect your wallet to create comments.');
        }
        if (!input.content.trim()) {
          throw new Error('Please provide content for the comment.');
        }
        try {
          const result = await client.forumActions.createComment(
            {
              postId: input.postId,
              content: input.content,
              currentUser,
              isAuthenticated: !!currentUser,
            },
            async () => { await refreshData(); }
          );
          return result.data || null;
        } catch {
          throw new Error('Failed to create comment. Please try again.');
        }
      },
      vote: async (input: { targetId: string; isUpvote: boolean }) => {
        if (!permissions.canVote) {
          throw new Error(permissions.voteReason);
        }
        if (!input.targetId) return false;
        try {
          // Use the unified vote method from ForumActions
          const result = await client.forumActions.vote(
            {
              targetId: input.targetId,
              isUpvote: input.isUpvote,
              currentUser,
              isAuthenticated: !!currentUser,
            },
            async () => { await refreshData(); }
          );
          return result.success;
        } catch {
          return false;
        }
      },
      moderate: {
        post: async (cellId: string, postId: string, reason?: string) => {
          try {
            const result = await client.forumActions.moderatePost(
              { cellId, postId, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
        unpost: async (cellId: string, postId: string, reason?: string) => {
          try {
            const result = await client.forumActions.unmoderatePost(
              { cellId, postId, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
        comment: async (cellId: string, commentId: string, reason?: string) => {
          try {
            const result = await client.forumActions.moderateComment(
              { cellId, commentId, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
        uncomment: async (cellId: string, commentId: string, reason?: string) => {
          try {
            const result = await client.forumActions.unmoderateComment(
              { cellId, commentId, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
        user: async (cellId: string, userAddress: string, reason?: string) => {
          try {
            const result = await client.forumActions.moderateUser(
              { cellId, userAddress, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
        unuser: async (cellId: string, userAddress: string, reason?: string) => {
          try {
            const result = await client.forumActions.unmoderateUser(
              { cellId, userAddress, reason, currentUser, isAuthenticated: !!currentUser, cellOwner: currentUser?.address || '' },
              async () => { await refreshData(); }
            );
            return result.success;
          } catch { return false; }
        },
      },
      togglePostBookmark: async (post: Post, cellId?: string) => {
        try {
          if (!currentUser?.address) return false;
          const { BookmarkService } = await import('@opchan/core');
          const added = await BookmarkService.togglePostBookmark(post, currentUser.address, cellId);
          // Update local state snapshot from DB cache for immediate UI feedback
          const updated = await client.database.getUserBookmarks(currentUser.address);
          setBookmarks(updated);
          return added;
        } catch (e) {
          console.error('togglePostBookmark failed', e);
          return false;
        }
      },
      toggleCommentBookmark: async (comment: Comment, postId?: string) => {
        try {
          if (!currentUser?.address) return false;
          const { BookmarkService } = await import('@opchan/core');
          const added = await BookmarkService.toggleCommentBookmark(comment, currentUser.address, postId);
          const updated = await client.database.getUserBookmarks(currentUser.address);
          setBookmarks(updated);
          return added;
        } catch (e) {
          console.error('toggleCommentBookmark failed', e);
          return false;
        }
      },
      refresh: async () => { await refreshData(); },
      pending: {
        isPending: (id?: string) => {
          return id ? client.database.isPending(id) : false;
        },
        isVotePending: (targetId?: string) => {
          if (!targetId || !currentUser?.address) return false;
          return Object.values(client.database.cache.votes).some(v => {
            return (
              v.targetId === targetId &&
              v.author === currentUser.address &&
              client.database.isPending(v.id)
            );
          });
        },
        onChange: (cb: () => void) => {
          return client.database.onPendingChange(cb);
        },
      },
    };
  }, [forumData, bookmarks, refreshData, currentUser, permissions, client]);

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



