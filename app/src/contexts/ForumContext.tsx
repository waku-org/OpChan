import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Cell, Post, Comment } from 'opchan-core/types/forum';
import {
  User,
  EVerificationStatus,
  EDisplayPreference,
} from 'opchan-core/types/identity';
import { useToast } from '@/components/ui/use-toast';

import { ForumActions } from 'opchan-core/forum/ForumActions';
import { monitorNetworkHealth, initializeNetwork } from 'opchan-core/waku/network';
import messageManager from 'opchan-core/waku';
import { getDataFromCache } from 'opchan-core/forum/transformers';
import { RelevanceCalculator } from 'opchan-core/forum/RelevanceCalculator';
import { UserVerificationStatus } from 'opchan-core/types/forum';
import { DelegationManager } from 'opchan-core/delegation';
import { UserIdentityService } from 'opchan-core/services/UserIdentityService';
import { MessageService } from 'opchan-core/services/MessageService';
import { useAuth } from '@/contexts/useAuth';
import { localDatabase } from 'opchan-core/database/LocalDatabase';

interface ForumContextType {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  // User verification status for display
  userVerificationStatus: UserVerificationStatus;
  // User identity service for profile management
  userIdentityService: UserIdentityService | null;
  // Granular loading states
  isInitialLoading: boolean;
  // Sync state
  lastSync: number | null;
  isSyncing: boolean;
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
  createPost: (
    cellId: string,
    title: string,
    content: string
  ) => Promise<Post | null>;
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  createCell: (
    name: string,
    description: string,
    icon?: string
  ) => Promise<Cell | null>;
  refreshData: () => Promise<void>;
  moderatePost: (
    cellId: string,
    postId: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
  unmoderatePost: (
    cellId: string,
    postId: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
  moderateComment: (
    cellId: string,
    commentId: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
  unmoderateComment: (
    cellId: string,
    commentId: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
  moderateUser: (
    cellId: string,
    userAddress: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
  unmoderateUser: (
    cellId: string,
    userAddress: string,
    reason: string | undefined,
    cellOwner: string
  ) => Promise<boolean>;
}

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export { ForumContext };

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [{ lastSync, isSyncing }, setSyncState] = useState({
    lastSync: null as number | null,
    isSyncing: false,
  });
  const [isPostingCell, setIsPostingCell] = useState(false);
  const [isPostingPost, setIsPostingPost] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNetworkConnected, setIsNetworkConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVerificationStatus, setUserVerificationStatus] =
    useState<UserVerificationStatus>({});

  const { toast } = useToast();
  const { currentUser, isAuthenticated } = useAuth();

  const delegationManager = useMemo(() => new DelegationManager(), []);
  const messageService = useMemo(
    () => new MessageService(delegationManager),
    [delegationManager]
  );
  const userIdentityService = useMemo(
    () => new UserIdentityService(messageService),
    [messageService]
  );
  const forumActions = useMemo(
    () => new ForumActions(delegationManager),
    [delegationManager]
  );

  // Transform message cache data to the expected types
  const updateStateFromCache = useCallback(async () => {
    // Build user verification status for relevance calculation
    const relevanceCalculator = new RelevanceCalculator();
    const allUsers: User[] = [];

    // Collect all unique users from posts, comments, and votes
    const userAddresses = new Set<string>();

    // Add users from posts
    Object.values(messageManager.messageCache.posts).forEach(post => {
      userAddresses.add(post.author);
    });

    // Add users from comments
    Object.values(messageManager.messageCache.comments).forEach(comment => {
      userAddresses.add(comment.author);
    });

    // Add users from votes
    Object.values(messageManager.messageCache.votes).forEach(vote => {
      userAddresses.add(vote.author);
    });

    // Create user objects for verification status using UserIdentityService
    const userIdentityPromises = Array.from(userAddresses).map(
      async address => {
        // Check if this address matches the current user's address
        if (currentUser && currentUser.address === address) {
          // Use the current user's actual verification status
          return {
            address,
            walletType: currentUser.walletType,
            verificationStatus: currentUser.verificationStatus,
            displayPreference: currentUser.displayPreference,
            ensDetails: currentUser.ensDetails,
            ordinalDetails: currentUser.ordinalDetails,
            lastChecked: currentUser.lastChecked,
          };
        } else {
          // Use UserIdentityService to get identity information
          const identity = await userIdentityService.getUserIdentity(address);
          if (identity) {
            return {
              address,
              walletType: address.startsWith('0x')
                ? ('ethereum' as const)
                : ('bitcoin' as const),
              verificationStatus: identity.verificationStatus,
              displayPreference: identity.displayPreference,
              ensDetails: identity.ensName
                ? { ensName: identity.ensName }
                : undefined,
              ordinalDetails: identity.ordinalDetails,
              lastChecked: identity.lastUpdated,
            };
          } else {
            // Fallback to generic user object
            return {
              address,
              walletType: address.startsWith('0x')
                ? ('ethereum' as const)
                : ('bitcoin' as const),
              verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
              displayPreference: EDisplayPreference.WALLET_ADDRESS,
            };
          }
        }
      }
    );

    const resolvedUsers = await Promise.all(userIdentityPromises);
    allUsers.push(...resolvedUsers);

    const initialStatus =
      relevanceCalculator.buildUserVerificationStatus(allUsers);

    // Transform data with relevance calculation
    const { cells, posts, comments } = await getDataFromCache(
      undefined,
      initialStatus
    );

    setCells(cells);
    setPosts(posts);
    setComments(comments);
    setUserVerificationStatus(initialStatus);
    // Sync state from LocalDatabase
    setSyncState(localDatabase.getSyncState());
  }, [currentUser, userIdentityService]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // SDS handles message syncing automatically, just update UI
      await updateStateFromCache();
      const { lastSync, isSyncing } = localDatabase.getSyncState();
      toast({
        title: 'Data Refreshed',
        description: lastSync
          ? `Your view has been updated. Last sync: ${new Date(
              lastSync
            ).toLocaleTimeString()}${isSyncing ? ' (syncing...)' : ''}`
          : 'Your view has been updated.',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Could not update the view. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Monitor network connection status
  useEffect(() => {
    const { unsubscribe } = monitorNetworkHealth(setIsNetworkConnected, toast);
    return unsubscribe;
  }, [toast]);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const loadData = async () => {
      setIsInitialLoading(true);
      // Open Local DB and seed Waku cache on warm start before network init
      try {
        await localDatabase.open();
        // Seed messageManager's in-memory cache from LocalDatabase for instant UI
        const seeded = localDatabase.cache;
        Object.assign(messageManager.messageCache.cells, seeded.cells);
        Object.assign(messageManager.messageCache.posts, seeded.posts);
        Object.assign(messageManager.messageCache.comments, seeded.comments);
        Object.assign(messageManager.messageCache.votes, seeded.votes);
        Object.assign(
          messageManager.messageCache.moderations,
          seeded.moderations
        );
        Object.assign(
          messageManager.messageCache.userIdentities,
          seeded.userIdentities
        );

        // Determine if we have any cached content
        const hasSeedData =
          Object.keys(seeded.cells).length > 0 ||
          Object.keys(seeded.posts).length > 0 ||
          Object.keys(seeded.comments).length > 0 ||
          Object.keys(seeded.votes).length > 0;

        // Render from local cache immediately (warm start) or empty (cold)
        await updateStateFromCache();

        // Initialize network and let incoming messages update LocalDatabase/Cache
        await initializeNetwork(toast, setError);

        if (hasSeedData) {
          setIsInitialLoading(false);
        } else {
          // Wait for Waku network to be healthy instead of first message
          const unsubscribeHealth = messageManager.onHealthChange(isReady => {
            if (isReady) {
              setIsInitialLoading(false);
              unsubscribeHealth();
            }
          });
        }
      } catch (e) {
        console.warn('LocalDatabase warm-start failed, continuing cold:', e);
        // Initialize network even if local DB failed, keep loader until Waku is healthy
        await initializeNetwork(toast, setError);

        const unsubscribeHealth = messageManager.onHealthChange(isReady => {
          if (isReady) {
            setIsInitialLoading(false);
            unsubscribeHealth();
          }
        });
      }
    };

    loadData();

    // Set up periodic queries
    // Setup periodic queries would go here
    // const { cleanup } = setupPeriodicQueries(updateStateFromCache);

    return () => {}; // Return empty cleanup function
  }, [toast, updateStateFromCache]);

  // Subscribe to incoming messages to update UI in real-time
  useEffect(() => {
    const unsubscribe = messageManager.onMessageReceived(() => {
      localDatabase.setSyncing(true);
      updateStateFromCache().finally(() => localDatabase.setSyncing(false));
    });
    return unsubscribe;
  }, [updateStateFromCache]);

  // Simple reactive updates: check for new data periodically when connected
  useEffect(() => {
    if (!isNetworkConnected) return;

    const interval = setInterval(() => {
      // Only update if we're connected and ready
      if (messageManager.isReady) {
        localDatabase.setSyncing(true);
        updateStateFromCache().finally(() => localDatabase.setSyncing(false));
      }
    }, 15000); // 15 seconds - much less frequent than before

    return () => clearInterval(interval);
  }, [isNetworkConnected, updateStateFromCache]);

  const getCellById = (id: string): Cell | undefined => {
    return cells.find(cell => cell.id === id);
  };

  const getPostsByCell = (cellId: string): Post[] => {
    return posts
      .filter(post => post.cellId === cellId)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  const getCommentsByPost = (postId: string): Comment[] => {
    return comments
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const handleCreatePost = async (
    cellId: string,
    title: string,
    content: string
  ): Promise<Post | null> => {
    setIsPostingPost(true);
    toast({
      title: 'Creating post',
      description: 'Sending your post to the network...',
    });

    const result = await forumActions.createPost(
      { cellId, title, content, currentUser, isAuthenticated },
      updateStateFromCache
    );

    setIsPostingPost(false);

    if (result.success) {
      toast({
        title: 'Post Created',
        description: 'Your post has been published successfully.',
      });
      return result.data || null;
    } else {
      toast({
        title: 'Post Failed',
        description: result.error || 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleCreateComment = async (
    postId: string,
    content: string
  ): Promise<Comment | null> => {
    setIsPostingComment(true);
    toast({
      title: 'Posting comment',
      description: 'Sending your comment to the network...',
    });

    const result = await forumActions.createComment(
      { postId, content, currentUser, isAuthenticated },
      updateStateFromCache
    );

    setIsPostingComment(false);

    if (result.success) {
      toast({
        title: 'Comment Added',
        description: 'Your comment has been published.',
      });
      return result.data || null;
    } else {
      toast({
        title: 'Comment Failed',
        description: result.error || 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleVotePost = async (
    postId: string,
    isUpvote: boolean
  ): Promise<boolean> => {
    setIsVoting(true);
    const voteType = isUpvote ? 'upvote' : 'downvote';
    toast({
      title: `Sending ${voteType}`,
      description: 'Recording your vote on the network...',
    });

    const result = await forumActions.vote(
      { targetId: postId, isUpvote, currentUser, isAuthenticated },
      updateStateFromCache
    );

    setIsVoting(false);

    if (result.success) {
      toast({
        title: 'Vote Recorded',
        description: `Your ${voteType} has been registered.`,
      });
      return result.data || false;
    } else {
      toast({
        title: 'Vote Failed',
        description:
          result.error || 'Failed to register your vote. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleVoteComment = async (
    commentId: string,
    isUpvote: boolean
  ): Promise<boolean> => {
    setIsVoting(true);
    const voteType = isUpvote ? 'upvote' : 'downvote';
    toast({
      title: `Sending ${voteType}`,
      description: 'Recording your vote on the network...',
    });

    const result = await forumActions.vote(
      { targetId: commentId, isUpvote, currentUser, isAuthenticated },
      updateStateFromCache
    );

    setIsVoting(false);

    if (result.success) {
      toast({
        title: 'Vote Recorded',
        description: `Your ${voteType} has been registered.`,
      });
      return result.data || false;
    } else {
      toast({
        title: 'Vote Failed',
        description:
          result.error || 'Failed to register your vote. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleCreateCell = async (
    name: string,
    description: string,
    icon?: string
  ): Promise<Cell | null> => {
    setIsPostingCell(true);
    toast({
      title: 'Creating cell',
      description: 'Sending your cell to the network...',
    });

    const result = await forumActions.createCell(
      { name, description, icon, currentUser, isAuthenticated },
      updateStateFromCache
    );

    setIsPostingCell(false);

    if (result.success) {
      toast({
        title: 'Cell Created',
        description: 'Your cell has been published.',
      });
      return result.data || null;
    } else {
      toast({
        title: 'Cell Failed',
        description: result.error || 'Failed to create cell. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleModeratePost = async (
    cellId: string,
    postId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    toast({
      title: 'Moderating Post',
      description: 'Sending moderation message to the network...',
    });

    const result = await forumActions.moderatePost(
      { cellId, postId, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'Post Moderated',
        description: 'The post has been marked as moderated.',
      });
      return result.data || false;
    } else {
      toast({
        title: 'Moderation Failed',
        description:
          result.error || 'Failed to moderate post. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUnmoderatePost = async (
    cellId: string,
    postId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    toast({
      title: 'Unmoderating Post',
      description: 'Sending unmoderation message to the network...',
    });

    const result = await forumActions.unmoderatePost(
      { cellId, postId, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'Post Unmoderated',
        description: 'The post is now visible again.',
      });
      return result.data || false;
    } else {
      toast({
        title: 'Unmoderation Failed',
        description:
          result.error || 'Failed to unmoderate post. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleModerateComment = async (
    cellId: string,
    commentId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    toast({
      title: 'Moderating Comment',
      description: 'Sending moderation message to the network...',
    });

    const result = await forumActions.moderateComment(
      { cellId, commentId, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'Comment Moderated',
        description: 'The comment has been marked as moderated.',
      });
      return result.data || false;
    } else {
      toast({
        title: 'Moderation Failed',
        description:
          result.error || 'Failed to moderate comment. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUnmoderateComment = async (
    cellId: string,
    commentId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    toast({
      title: 'Unmoderating Comment',
      description: 'Sending unmoderation message to the network...',
    });

    const result = await forumActions.unmoderateComment(
      { cellId, commentId, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'Comment Unmoderated',
        description: 'The comment is now visible again.',
      });
      return result.data || false;
    } else {
      toast({
        title: 'Unmoderation Failed',
        description:
          result.error || 'Failed to unmoderate comment. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleModerateUser = async (
    cellId: string,
    userAddress: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    const result = await forumActions.moderateUser(
      { cellId, userAddress, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'User Moderated',
        description: `User ${userAddress} has been moderated in this cell.`,
      });
      return result.data || false;
    } else {
      toast({
        title: 'Moderation Failed',
        description:
          result.error || 'Failed to moderate user. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUnmoderateUser = async (
    cellId: string,
    userAddress: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    const result = await forumActions.unmoderateUser(
      { cellId, userAddress, reason, currentUser, isAuthenticated, cellOwner },
      updateStateFromCache
    );

    if (result.success) {
      toast({
        title: 'User Unmoderated',
        description: `User ${userAddress} has been unmoderated in this cell.`,
      });
      return result.data || false;
    } else {
      toast({
        title: 'Unmoderation Failed',
        description:
          result.error || 'Failed to unmoderate user. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <ForumContext.Provider
      value={{
        cells,
        posts,
        comments,
        userVerificationStatus,
        userIdentityService,
        isInitialLoading,
        lastSync,
        isSyncing,
        isPostingCell,
        isPostingPost,
        isPostingComment,
        isVoting,
        isRefreshing,
        isNetworkConnected,
        error,
        getCellById,
        getPostsByCell,
        getCommentsByPost,
        createPost: handleCreatePost,
        createComment: handleCreateComment,
        votePost: handleVotePost,
        voteComment: handleVoteComment,
        createCell: handleCreateCell,
        refreshData: handleRefreshData,
        moderatePost: handleModeratePost,
        unmoderatePost: handleUnmoderatePost,
        moderateComment: handleModerateComment,
        unmoderateComment: handleUnmoderateComment,
        moderateUser: handleModerateUser,
        unmoderateUser: handleUnmoderateUser,
      }}
    >
      {children}
    </ForumContext.Provider>
  );
}
