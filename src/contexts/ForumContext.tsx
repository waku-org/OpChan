import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Cell, Post, Comment } from '@/types/forum';
import { mockCells, mockPosts, mockComments } from '@/data/mockData';
import { useAuth } from './AuthContext';

interface ForumContextType {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  loading: boolean;
  error: string | null;
  getCellById: (id: string) => Cell | undefined;
  getPostsByCell: (cellId: string) => Post[];
  getCommentsByPost: (postId: string) => Comment[];
  createPost: (cellId: string, content: string) => Promise<Post | null>;
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  createCell: (title: string, description: string, icon: string) => Promise<Cell | null>;
}

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCells(mockCells);
        setPosts(mockPosts);
        setComments(mockComments);
      } catch (err) {
        console.error("Error loading forum data:", err);
        setError("Failed to load forum data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  const createPost = async (cellId: string, content: string): Promise<Post | null> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to post.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const newPost: Post = {
        id: `post-${Date.now()}`,
        cellId,
        authorAddress: currentUser.address,
        content,
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
      };

      setPosts(prev => [newPost, ...prev]);
      
      toast({
        title: "Post Created",
        description: "Your post has been published successfully.",
      });
      
      return newPost;
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Post Failed",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
      return null;
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
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId,
        authorAddress: currentUser.address,
        content,
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
      };

      setComments(prev => [...prev, newComment]);
      
      toast({
        title: "Comment Added",
        description: "Your comment has been published.",
      });
      
      return newComment;
    } catch (error) {
      console.error("Error creating comment:", error);
      toast({
        title: "Comment Failed",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
      return null;
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
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const userAddress = currentUser.address;
          
          const filteredUpvotes = post.upvotes.filter(addr => addr !== userAddress);
          const filteredDownvotes = post.downvotes.filter(addr => addr !== userAddress);
          
          if (isUpvote) {
            return {
              ...post,
              upvotes: [...filteredUpvotes, userAddress],
              downvotes: filteredDownvotes,
            };
          } else {
            return {
              ...post,
              upvotes: filteredUpvotes,
              downvotes: [...filteredDownvotes, userAddress],
            };
          }
        }
        return post;
      }));
      
      return true;
    } catch (error) {
      console.error("Error voting on post:", error);
      toast({
        title: "Vote Failed",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
      return false;
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
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const userAddress = currentUser.address;
          
          const filteredUpvotes = comment.upvotes.filter(addr => addr !== userAddress);
          const filteredDownvotes = comment.downvotes.filter(addr => addr !== userAddress);
          
          if (isUpvote) {
            return {
              ...comment,
              upvotes: [...filteredUpvotes, userAddress],
              downvotes: filteredDownvotes,
            };
          } else {
            return {
              ...comment,
              upvotes: filteredUpvotes,
              downvotes: [...filteredDownvotes, userAddress],
            };
          }
        }
        return comment;
      }));
      
      return true;
    } catch (error) {
      console.error("Error voting on comment:", error);
      toast({
        title: "Vote Failed",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const createCell = async (title: string, description: string, icon: string): Promise<Cell | null> => {
    if (!isAuthenticated || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You need to verify Ordinal ownership to create a cell.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const newCell: Cell = {
        id: `cell-${Date.now()}`,
        name: title,
        description,
        icon,
      };

      setCells(prev => [...prev, newCell]);
      
      toast({
        title: "Cell Created",
        description: "Your cell has been created successfully.",
      });
      
      return newCell;
    } catch (error) {
      console.error("Error creating cell:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create cell. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  return (
    <ForumContext.Provider
      value={{
        cells,
        posts,
        comments,
        loading,
        error,
        getCellById,
        getPostsByCell,
        getCommentsByPost,
        createPost,
        createComment,
        votePost,
        voteComment,
        createCell,
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
