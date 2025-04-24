import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cell, Post, Comment } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createPost, 
  createComment, 
  vote, 
  createCell 
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
  error: string | null;
  getCellById: (id: string) => Cell | undefined;
  getPostsByCell: (cellId: string) => Post[];
  getCommentsByPost: (postId: string) => Comment[];
  createPost: (cellId: string, title: string, content: string) => Promise<Post | null>;
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  createCell: (name: string, description: string, icon: string) => Promise<Cell | null>;
  refreshData: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { currentUser, isAuthenticated, messageSigning } = useAuth();
  
  // Transform message cache data to the expected types
  const updateStateFromCache = () => {
    // Transform cells
    setCells(
      Object.values(messageManager.messageCache.cells).map(cell => 
        transformCell(cell)
      )
    );
    
    // Transform posts
    setPosts(
      Object.values(messageManager.messageCache.posts).map(post => 
        transformPost(post)
      )
    );
    
    // Transform comments
    setComments(
      Object.values(messageManager.messageCache.comments).map(comment => 
        transformComment(comment)
      )
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
        refreshData: handleRefreshData
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
