import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Cell, Post, Comment } from '@/types';
import { useAuth } from './AuthContext';
import messageManager from '@/lib/waku';
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage } from '@/lib/waku/types';
import { v4 as uuidv4 } from 'uuid';

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
  
  // Replace single loading state with granular loading states
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

  // Helper function to transform CellMessage to Cell
  const transformCell = (cellMessage: CellMessage): Cell => {
    return {
      id: cellMessage.id,
      name: cellMessage.name,
      description: cellMessage.description,
      icon: cellMessage.icon
    };
  };

  // Helper function to transform PostMessage to Post with vote aggregation
  const transformPost = (postMessage: PostMessage): Post => {
    // Find all votes related to this post
    const votes = Object.values(messageManager.messageCache.votes).filter(
      vote => vote.targetId === postMessage.id
    );

    const upvotes = votes.filter(vote => vote.value === 1);
    const downvotes = votes.filter(vote => vote.value === -1);

    return {
      id: postMessage.id,
      cellId: postMessage.cellId,
      authorAddress: postMessage.author,
      title: postMessage.title,
      content: postMessage.content,
      timestamp: postMessage.timestamp,
      upvotes: upvotes,
      downvotes: downvotes
    };
  };

  // Helper function to transform CommentMessage to Comment with vote aggregation
  const transformComment = (commentMessage: CommentMessage): Comment => {
    // Find all votes related to this comment
    const votes = Object.values(messageManager.messageCache.votes).filter(
      vote => vote.targetId === commentMessage.id
    );
    
    const upvotes = votes.filter(vote => vote.value === 1);
    const downvotes = votes.filter(vote => vote.value === -1);

    return {
      id: commentMessage.id,
      postId: commentMessage.postId,
      authorAddress: commentMessage.author,
      content: commentMessage.content,
      timestamp: commentMessage.timestamp,
      upvotes: upvotes,
      downvotes: downvotes
    };
  };

  // Function to update UI state from message cache
  const updateStateFromCache = () => {
    // Transform cells
    const cellsArray = Object.values(messageManager.messageCache.cells).map(transformCell);
    
    // Transform posts
    const postsArray = Object.values(messageManager.messageCache.posts).map(transformPost);
    
    // Transform comments
    const commentsArray = Object.values(messageManager.messageCache.comments).map(transformComment);
    
    setCells(cellsArray);
    setPosts(postsArray);
    setComments(commentsArray);
  };

  // Function to refresh data from the network
  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      toast({
        title: "Refreshing data",
        description: "Fetching latest messages from the network...",
      });
      
      // Try to connect if not already connected
      if (!isNetworkConnected) {
        try {
          await messageManager.waitForRemotePeer(10000);
        } catch (err) {
          console.warn("Could not connect to peer during refresh:", err);
        }
      }
      
      // Query historical messages from the store
      await messageManager.queryStore();
      
      // Update UI state from the cache
      updateStateFromCache();
      
      toast({
        title: "Data refreshed",
        description: "Your view has been updated with the latest messages.",
      });
    } catch (err) {
      console.error("Error refreshing data:", err);
      toast({
        title: "Refresh failed",
        description: "Could not fetch the latest messages. Please try again.",
        variant: "destructive",
      });
      setError("Failed to refresh data. Please try again later.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Monitor network connection status
  useEffect(() => {
    // Initial status
    setIsNetworkConnected(messageManager.isReady);
    
    // Subscribe to health changes
    const unsubscribe = messageManager.onHealthChange((isReady) => {
      setIsNetworkConnected(isReady);
      
      if (isReady) {
        toast({
          title: "Network connected",
          description: "Connected to the Waku network",
        });
      } else {
        toast({
          title: "Network disconnected",
          description: "Lost connection to the Waku network",
          variant: "destructive",
        });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);
        
        toast({
          title: "Loading data",
          description: "Connecting to the Waku network...",
        });
        
        // Wait for peer connection with timeout
        try {
          await messageManager.waitForRemotePeer(15000);
        } catch (err) {
          toast({
            title: "Connection timeout",
            description: "Could not connect to any peers. Some features may be unavailable.",
            variant: "destructive",
          });
          console.warn("Timeout connecting to peer:", err);
        }
        
        // Query historical messages from the store
        await messageManager.queryStore();
        
        // Subscribe to new messages
        await messageManager.subscribeToMessages();
        
        // Update UI state from the cache
        updateStateFromCache();
      } catch (err) {
        console.error("Error loading forum data:", err);
        setError("Failed to load forum data. Please try again later.");
        
        toast({
          title: "Connection error",
          description: "Failed to connect to Waku network. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();

    // Set up a polling mechanism to refresh the UI every few seconds
    // This is a temporary solution until we implement real-time updates with message callbacks
    const uiRefreshInterval = setInterval(() => {
      updateStateFromCache();
    }, 5000);
    
    // Set up regular network queries to fetch new messages
    const networkQueryInterval = setInterval(async () => {
      if (isNetworkConnected) {
        try {
          await messageManager.queryStore();
          // No need to call updateStateFromCache() here as the UI refresh interval will handle that
        } catch (err) {
          console.warn("Error during scheduled network query:", err);
        }
      }
    }, 3000);

    return () => {
      clearInterval(uiRefreshInterval);
      clearInterval(networkQueryInterval);
      // You might want to clean up subscriptions here
    };
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

  const createPost = async (cellId: string, title: string, content: string): Promise<Post | null> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to post.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsPostingPost(true);
      
      toast({
        title: "Creating post",
        description: "Sending your post to the network...",
      });
      
      const postId = uuidv4();
      
      const postMessage: PostMessage = {
        type: MessageType.POST,
        id: postId,
        cellId,
        title,
        content,
        timestamp: Date.now(),
        author: currentUser.address
      };

      // Send the message to the network
      await messageManager.sendMessage(postMessage);
      
      // Update UI (the cache is already updated in sendMessage)
      updateStateFromCache();
      
      toast({
        title: "Post Created",
        description: "Your post has been published successfully.",
      });
      
      // Return the transformed post
      return transformPost(postMessage);
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Post Failed",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsPostingPost(false);
    }
  };

  const createComment = async (postId: string, content: string): Promise<Comment | null> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to comment.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsPostingComment(true);
      
      toast({
        title: "Posting comment",
        description: "Sending your comment to the network...",
      });
      
      const commentId = uuidv4();
      
      const commentMessage: CommentMessage = {
        type: MessageType.COMMENT,
        id: commentId,
        postId,
        content,
        timestamp: Date.now(),
        author: currentUser.address
      };

      // Send the message to the network
      await messageManager.sendMessage(commentMessage);
      
      // Update UI (the cache is already updated in sendMessage)
      updateStateFromCache();
      
      toast({
        title: "Comment Added",
        description: "Your comment has been published.",
      });
      
      // Return the transformed comment
      return transformComment(commentMessage);
    } catch (error) {
      console.error("Error creating comment:", error);
      toast({
        title: "Comment Failed",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsPostingComment(false);
    }
  };

  const votePost = async (postId: string, isUpvote: boolean): Promise<boolean> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to vote.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsVoting(true);
      
      const voteType = isUpvote ? "upvote" : "downvote";
      toast({
        title: `Sending ${voteType}`,
        description: "Recording your vote on the network...",
      });
      
      const voteId = uuidv4();
      
      const voteMessage: VoteMessage = {
        type: MessageType.VOTE,
        id: voteId,
        targetId: postId,
        value: isUpvote ? 1 : -1,
        timestamp: Date.now(),
        author: currentUser.address
      };

      // Send the vote message to the network
      await messageManager.sendMessage(voteMessage);
      
      // Update UI (the cache is already updated in sendMessage)
      updateStateFromCache();
      
      toast({
        title: "Vote Recorded",
        description: `Your ${voteType} has been registered.`,
      });
      
      return true;
    } catch (error) {
      console.error("Error voting on post:", error);
      toast({
        title: "Vote Failed",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsVoting(false);
    }
  };

  const voteComment = async (commentId: string, isUpvote: boolean): Promise<boolean> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to vote.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsVoting(true);
      
      const voteType = isUpvote ? "upvote" : "downvote";
      toast({
        title: `Sending ${voteType}`,
        description: "Recording your vote on the network...",
      });
      
      const voteId = uuidv4();
      
      const voteMessage: VoteMessage = {
        type: MessageType.VOTE,
        id: voteId,
        targetId: commentId,
        value: isUpvote ? 1 : -1,
        timestamp: Date.now(),
        author: currentUser.address
      };

      // Send the vote message to the network
      await messageManager.sendMessage(voteMessage);
      
      // Update UI (the cache is already updated in sendMessage)
      updateStateFromCache();
      
      toast({
        title: "Vote Recorded",
        description: `Your ${voteType} has been registered.`,
      });
      
      return true;
    } catch (error) {
      console.error("Error voting on comment:", error);
      toast({
        title: "Vote Failed",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsVoting(false);
    }
  };

  const createCell = async (name: string, description: string, icon: string): Promise<Cell | null> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to create a cell.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsPostingCell(true);
      
      toast({
        title: "Creating cell",
        description: "Sending your cell to the network...",
      });
      
      const cellId = uuidv4();
      
      const cellMessage: CellMessage = {
        type: MessageType.CELL,
        id: cellId,
        name,
        description,
        icon,
        timestamp: Date.now(),
        author: currentUser.address
      };

      // Send the cell message to the network
      await messageManager.sendMessage(cellMessage);
      
      // Update UI (the cache is already updated in sendMessage)
      updateStateFromCache();
      
      toast({
        title: "Cell Created",
        description: "Your cell has been created successfully.",
      });
      
      return transformCell(cellMessage);
    } catch (error) {
      console.error("Error creating cell:", error);
      toast({
        title: "Cell Creation Failed",
        description: "Failed to create cell. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsPostingCell(false);
    }
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
        createPost,
        createComment,
        votePost,
        voteComment,
        createCell,
        refreshData
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
