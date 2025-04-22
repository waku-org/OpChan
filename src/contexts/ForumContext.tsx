import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Cell, Post, Comment } from '@/types';
import { useAuth } from './AuthContext';
import { 
  getDataFromCache, 
  createPost, 
  createComment, 
  vote, 
  createCell, 
  refreshData as refreshNetworkData, 
  initializeNetwork, 
  setupPeriodicQueries, 
  monitorNetworkHealth,
  ForumContextType
} from './forum';

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  
// Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPostingCell, setIsPostingCell] = useState(false);
  const [isPostingPost, setIsPostingPost] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Network connection status
  const [isNetworkConnected, setIsNetworkConnected] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Function to update UI state from message cache
  const updateStateFromCache = () => {
    const data = getDataFromCache();
    setCells(data.cells);
    setPosts(data.posts);
    setComments(data.comments);
  };

  // Function to refresh data from the network
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await refreshNetworkData(isNetworkConnected, toast, updateStateFromCache, setError);
    setIsRefreshing(false);
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
    const result = await createPost(cellId, title, content, currentUser, isAuthenticated, toast, updateStateFromCache);
    setIsPostingPost(false);
    return result;
  };

  const handleCreateComment = async (postId: string, content: string): Promise<Comment | null> => {
    setIsPostingComment(true);
    const result = await createComment(postId, content, currentUser, isAuthenticated, toast, updateStateFromCache);
    setIsPostingComment(false);
    return result;
  };

  const handleVotePost = async (postId: string, isUpvote: boolean): Promise<boolean> => {
    setIsVoting(true);
    const result = await vote(postId, isUpvote, currentUser, isAuthenticated, toast, updateStateFromCache);
    setIsVoting(false);
    return result;
  };

  const handleVoteComment = async (commentId: string, isUpvote: boolean): Promise<boolean> => {
    setIsVoting(true);
    const result = await vote(commentId, isUpvote, currentUser, isAuthenticated, toast, updateStateFromCache);
    setIsVoting(false);
    return result;
  };

  const handleCreateCell = async (name: string, description: string, icon: string): Promise<Cell | null> => {
    setIsPostingCell(true);
    const result = await createCell(name, description, icon, currentUser, isAuthenticated, toast, updateStateFromCache);
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
    throw new Error('useForum must be used within a ForumProvider');
  }
  return context;
};
