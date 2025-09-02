import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Cell, Post, Comment, OpchanMessage } from '@/types/forum';
import { User, EVerificationStatus, DisplayPreference } from '@/types/identity';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { ForumActions } from '@/lib/forum/ForumActions';
import {
  setupPeriodicQueries,
  monitorNetworkHealth,
  initializeNetwork,
} from '@/lib/waku/network';
import messageManager from '@/lib/waku';
import { getDataFromCache } from '@/lib/forum/transformers';
import { RelevanceCalculator } from '@/lib/forum/RelevanceCalculator';
import { UserVerificationStatus } from '@/types/forum';
import { DelegationManager } from '@/lib/delegation';
import { getEnsName } from '@wagmi/core';
import { config } from '@/lib/wallet/config';

interface ForumContextType {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  // User verification status for display
  userVerificationStatus: UserVerificationStatus;
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
  moderateComment: (
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
}

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export { ForumContext };

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
  const forumActions = useMemo(
    () => new ForumActions(delegationManager),
    [delegationManager]
  );

  // Transform message cache data to the expected types
  const updateStateFromCache = useCallback(() => {
    // Use the verifyMessage function from delegationManager if available
    const verifyFn = isAuthenticated
      ? (message: OpchanMessage) => delegationManager.verifyMessage(message)
      : undefined;

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

    // Create user objects for verification status
    Array.from(userAddresses).forEach(address => {
      // Check if this address matches the current user's address
      if (currentUser && currentUser.address === address) {
        // Use the current user's actual verification status
        allUsers.push({
          address,
          walletType: currentUser.walletType,
          verificationStatus: currentUser.verificationStatus,
          displayPreference: currentUser.displayPreference,
          ensDetails: currentUser.ensDetails,
          ordinalDetails: currentUser.ordinalDetails,
          lastChecked: currentUser.lastChecked,
        });
      } else {
        // Create generic user object for other addresses
        allUsers.push({
          address,
          walletType: address.startsWith('0x') ? 'ethereum' : 'bitcoin',
          verificationStatus: EVerificationStatus.UNVERIFIED,
          displayPreference: DisplayPreference.WALLET_ADDRESS,
        });
      }
    });

    const initialStatus =
      relevanceCalculator.buildUserVerificationStatus(allUsers);

    // Transform data with relevance calculation (initial pass)
    const { cells, posts, comments } = getDataFromCache(
      verifyFn,
      initialStatus
    );

    setCells(cells);
    setPosts(posts);
    setComments(comments);
    setUserVerificationStatus(initialStatus);

    // Enrich: resolve ENS for ethereum addresses asynchronously and update
    (async () => {
      const targets = allUsers.filter(
        u => u.walletType === 'ethereum' && !u.ensDetails
      );
      if (targets.length === 0) return;
      const lookups = await Promise.all(
        targets.map(async u => {
          try {
            const name = await getEnsName(config, {
              address: u.address as `0x${string}`,
            });
            return { address: u.address, ensName: name || undefined };
          } catch {
            return { address: u.address, ensName: undefined };
          }
        })
      );
      const ensByAddress = new Map<string, string | undefined>(
        lookups.map(l => [l.address, l.ensName])
      );
      const enrichedUsers: User[] = allUsers.map(u => {
        const ensName = ensByAddress.get(u.address);
        if (ensName) {
          return {
            ...u,
            walletType: 'ethereum',
            ensOwnership: true,
            ensName,
            verificationStatus: 'verified-owner',
          } as User;
        }
        return u;
      });
      const enrichedStatus =
        relevanceCalculator.buildUserVerificationStatus(enrichedUsers);
      const transformed = getDataFromCache(verifyFn, enrichedStatus);
      setCells(transformed.cells);
      setPosts(transformed.posts);
      setComments(transformed.comments);
      setUserVerificationStatus(enrichedStatus);
    })();
  }, [delegationManager, isAuthenticated, currentUser]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // SDS handles message syncing automatically, just update UI
      updateStateFromCache();
      toast({
        title: 'Data Refreshed',
        description: 'Your view has been updated.',
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

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);
      await initializeNetwork(toast, updateStateFromCache, setError);
      setIsInitialLoading(false);
    };

    loadData();

    // Set up periodic queries
    const { cleanup } = setupPeriodicQueries(updateStateFromCache);

    return cleanup;
  }, [isNetworkConnected, toast, updateStateFromCache]);

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

  return (
    <ForumContext.Provider
      value={{
        cells,
        posts,
        comments,
        userVerificationStatus,
        isInitialLoading,
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
        moderateComment: handleModerateComment,
        moderateUser: handleModerateUser,
      }}
    >
      {children}
    </ForumContext.Provider>
  );
}
