import { v4 as uuidv4 } from 'uuid';
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage } from '@/lib/waku/types';
import messageManager from '@/lib/waku';
import { Cell, Comment, Post, User } from '@/types';
import { transformCell, transformComment, transformPost } from './transformers';

type ToastFunction = (props: { 
  title: string; 
  description: string; 
  variant?: "default" | "destructive"; 
}) => void;

// Create a post
export const createPost = async (
  cellId: string, 
  title: string, 
  content: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void
): Promise<Post | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to post.",
      variant: "destructive",
    });
    return null;
  }

  try {
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
  }
};

// Create a comment
export const createComment = async (
  postId: string, 
  content: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void
): Promise<Comment | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to comment.",
      variant: "destructive",
    });
    return null;
  }

  try {
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
  }
};

// Vote on a post or comment
export const vote = async (
  targetId: string, 
  isUpvote: boolean, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to vote.",
      variant: "destructive",
    });
    return false;
  }

  try {
    const voteType = isUpvote ? "upvote" : "downvote";
    toast({
      title: `Sending ${voteType}`,
      description: "Recording your vote on the network...",
    });
    
    const voteId = uuidv4();
    
    const voteMessage: VoteMessage = {
      type: MessageType.VOTE,
      id: voteId,
      targetId,
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
    console.error("Error voting:", error);
    toast({
      title: "Vote Failed",
      description: "Failed to register your vote. Please try again.",
      variant: "destructive",
    });
    return false;
  }
};

// Create a cell
export const createCell = async (
  name: string, 
  description: string, 
  icon: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void
): Promise<Cell | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to create a cell.",
      variant: "destructive",
    });
    return null;
  }

  try {
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
  }
}; 