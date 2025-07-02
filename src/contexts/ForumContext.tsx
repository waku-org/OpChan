import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cell, Post, Comment, OpchanMessage } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createPost, 
  createComment, 
  vote, 
  createCell, 
  moderatePost, 
  moderateComment, 
  moderateUser 
} from './forum/actions';
import { 
  setupPeriodicQueries, 
  monitorNetworkHealth, 
  initializeNetwork 
} from './forum/network';
import messageManager from '@/lib/waku';
import { transformCell, transformComment, transformPost } from './forum/transformers';

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
  isSyncing: boolean;
  outboxCount: number;
  pendingMessageIds: string[];
  error: string | null;
  isMessagePending: (messageId: string) => boolean;
  getCellById: (id: string) => Cell | undefined;
  getPostsByCell: (cellId: string) => Post[];
  getCommentsByPost: (postId: string) => Comment[];
  createPost: (cellId: string, title: string, content: string) => Promise<Post | null>;
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  createCell: (name: string, description: string, icon: string) => Promise<Cell | null>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [pendingMessageIds, setPendingMessageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { currentUser, isAuthenticated, messageSigning } = useAuth();
  
  // Function to update outbox count and pending message IDs
  const updateOutboxCount = async () => {
    try {
      const count = await messageManager.getOutboxCount();
      setOutboxCount(count);
      
      // Also update pending message IDs
      const { db } = await import('@/lib/storage/db');
      const pendingIds = await db.getPendingMessageIds();
      setPendingMessageIds(pendingIds);
    } catch (err) {
      console.warn("Failed to get outbox count:", err);
    }
  };

  // Helper function to check if a message is pending
  const isMessagePending = (messageId: string) => {
    return pendingMessageIds.includes(messageId);
  };
  
  // Transform message cache data to the expected types
  const updateStateFromCache = () => {
    // Use the verifyMessage function from messageSigning if available
    const verifyFn = isAuthenticated && messageSigning ? 
      (message: OpchanMessage) => messageSigning.verifyMessage(message) : 
      undefined;
    
    // Transform cells with verification
    setCells(
      Object.values(messageManager.messageCache.cells)
        .map(cell => transformCell(cell, verifyFn))
        .filter(cell => cell !== null) as Cell[]
    );
    
    // Transform posts with verification
    setPosts(
      Object.values(messageManager.messageCache.posts)
        .map(post => transformPost(post, verifyFn))
        .filter(post => post !== null) as Post[]
    );
    
    // Transform comments with verification
    setComments(
      Object.values(messageManager.messageCache.comments)
        .map(comment => transformComment(comment, verifyFn))
        .filter(comment => comment !== null) as Comment[]
    );
  };
  
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
    const { unsubscribe } = monitorNetworkHealth(
      (isConnected) => {
        setIsNetworkConnected(isConnected);
        if (isConnected) {
          // When coming back online, sync will happen automatically
          // but we should update the outbox count
          updateOutboxCount();
          setIsSyncing(true);
          // Reset syncing state after a short delay and update outbox again
          setTimeout(async () => {
            setIsSyncing(false);
            await updateOutboxCount();
          }, 3000);
        }
      }, 
      toast
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);
      // Load initial outbox count
      await updateOutboxCount();
      await initializeNetwork(toast, updateStateFromCache, setError);
      setIsInitialLoading(false);
    };

    loadData();

    // Set up periodic queries
    const { cleanup } = setupPeriodicQueries(isNetworkConnected, updateStateFromCache);

    return cleanup;
  }, [toast]);

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
      messageSigning
    );
    setIsPostingPost(false);
    // Update outbox count in case the message was queued offline
    await updateOutboxCount();
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
      messageSigning
    );
    setIsPostingComment(false);
    // Update outbox count in case the message was queued offline
    await updateOutboxCount();
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
      messageSigning
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
      messageSigning
    );
    setIsVoting(false);
    return result;
  };

  const handleCreateCell = async (name: string, description: string, icon: string): Promise<Cell | null> => {
    setIsPostingCell(true);
    const result = await createCell(
      name, 
      description, 
      icon, 
      currentUser, 
      isAuthenticated, 
      toast, 
      updateStateFromCache,
      messageSigning
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
      messageSigning
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
      messageSigning
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
      messageSigning
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
        isSyncing,
        outboxCount,
        pendingMessageIds,
        error,
        isMessagePending,
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

export const useForum = () => {
  const context = useContext(ForumContext);
  if (context === undefined) {
    throw new Error("useForum must be used within a ForumProvider");
  }
  return context;
};
