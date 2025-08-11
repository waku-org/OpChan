import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Cell, Post, Comment, OpchanMessage, User } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { 
  createPost, 
  createComment, 
  vote, 
  createCell, 
  moderatePost, 
  moderateComment, 
  moderateUser 
} from '@/lib/forum/actions';
import { 
  setupPeriodicQueries, 
  monitorNetworkHealth, 
  initializeNetwork 
} from '@/lib/waku/network';
import messageManager from '@/lib/waku';
import { getDataFromCache } from '@/lib/forum/transformers';
import { RelevanceCalculator, UserVerificationStatus } from '@/lib/forum/relevance';
import { AuthService } from '@/lib/identity/services/AuthService';

interface ForumContextType {
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
  createCell: (name: string, description: string, icon?: string) => Promise<Cell | null>;
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
  
  const { toast } = useToast();
  const { currentUser, isAuthenticated } = useAuth();
  
  const authService = useMemo(() => new AuthService(), []);
  
  // Transform message cache data to the expected types
  const updateStateFromCache = useCallback(() => {
    // Use the verifyMessage function from authService if available
    const verifyFn = isAuthenticated ? 
      (message: OpchanMessage) => authService.verifyMessage(message) : 
      undefined;
    
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
      allUsers.push({
        address,
        walletType: 'bitcoin', // Default, will be updated if we have more info
        verificationStatus: 'unverified'
      });
    });
    
    const userVerificationStatus = relevanceCalculator.buildUserVerificationStatus(allUsers);
    
    // Transform data with relevance calculation
    const { cells, posts, comments } = getDataFromCache(verifyFn, userVerificationStatus);
    
    setCells(cells);
    setPosts(posts);
    setComments(comments);
  }, [authService, isAuthenticated]);
  
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Manually query the network for updates
      await messageManager.queryStore();
      updateStateFromCache();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not fetch the latest data. Please try again.",
        variant: "destructive",
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
    const { cleanup } = setupPeriodicQueries(isNetworkConnected, updateStateFromCache);

    return cleanup;
  }, [isNetworkConnected, toast, updateStateFromCache]);

  const getCellById = (id: string): Cell | undefined => {
    return cells.find(cell => cell.id === id);
  };

  const getPostsByCell = (cellId: string): Post[] => {
    return posts.filter(post => post.cellId === cellId)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  const getCommentsByPost = (postId: string): Comment[] => {
    return comments.filter(comment => comment.postId === postId)
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const handleCreatePost = async (cellId: string, title: string, content: string): Promise<Post | null> => {
    setIsPostingPost(true);
    const result = await createPost(
      cellId, 
      title, 
      content, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      authService
    );
    setIsPostingPost(false);
    return result;
  };

  const handleCreateComment = async (postId: string, content: string): Promise<Comment | null> => {
    setIsPostingComment(true);
    const result = await createComment(
      postId, 
      content, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      authService
    );
    setIsPostingComment(false);
    return result;
  };

  const handleVotePost = async (postId: string, isUpvote: boolean): Promise<boolean> => {
    setIsVoting(true);
    const result = await vote(
      postId, 
      isUpvote, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      authService
    );
    setIsVoting(false);
    return result;
  };

  const handleVoteComment = async (commentId: string, isUpvote: boolean): Promise<boolean> => {
    setIsVoting(true);
    const result = await vote(
      commentId, 
      isUpvote, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      authService
    );
    setIsVoting(false);
    return result;
  };

  const handleCreateCell = async (name: string, description: string, icon?: string): Promise<Cell | null> => {
    setIsPostingCell(true);
    const result = await createCell(
      name, 
      description, 
      icon, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      authService
    );
    setIsPostingCell(false);
    return result;
  };

  const handleModeratePost = async (
    cellId: string,
    postId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    return moderatePost(
      cellId,
      postId,
      reason,
      currentUser,
      isAuthenticated,
      cellOwner,
      toast,
      updateStateFromCache,
      authService
    );
  };

  const handleModerateComment = async (
    cellId: string,
    commentId: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    return moderateComment(
      cellId,
      commentId,
      reason,
      currentUser,
      isAuthenticated,
      cellOwner,
      toast,
      updateStateFromCache,
      authService
    );
  };

  const handleModerateUser = async (
    cellId: string,
    userAddress: string,
    reason: string | undefined,
    cellOwner: string
  ) => {
    return moderateUser(
      cellId,
      userAddress,
      reason,
      currentUser,
      isAuthenticated,
      cellOwner,
      toast,
      updateStateFromCache,
      authService
    );
  };

  return (
    <ForumContext.Provider
      value={{
        cells,
        posts,
        comments,
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
        moderateUser: handleModerateUser
      }}
    >
      {children}
    </ForumContext.Provider>
  );
}


