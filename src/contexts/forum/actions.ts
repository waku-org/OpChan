import { v4 as uuidv4 } from 'uuid';
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage, ModerateMessage } from '@/lib/waku/types';
import messageManager from '@/lib/waku';
import { Cell, Comment, Post, User } from '@/types';
import { transformCell, transformComment, transformPost } from './transformers';
import { MessageSigning } from '@/lib/identity/signatures/message-signing';

type ToastFunction = (props: { 
  title: string; 
  description: string; 
  variant?: "default" | "destructive"; 
}) => void;

type AllowedMessages = PostMessage | CommentMessage | VoteMessage | CellMessage | ModerateMessage;

async function signAndSendMessage<T extends AllowedMessages>(
  message: T,
  currentUser: User | null,
  messageSigning: MessageSigning,
  toast: ToastFunction
): Promise<T | null> {
  if (!currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to be authenticated to perform this action.",
      variant: "destructive",
    });
    return null;
  }
  
  try {
    let signedMessage: T | null = null;
    
    if (messageSigning) {
      signedMessage = await messageSigning.signMessage(message);
      
      if (!signedMessage) {
        // Check if delegation exists but is expired
        const isDelegationExpired = messageSigning['keyDelegation'] && 
          !messageSigning['keyDelegation'].isDelegationValid() && 
          messageSigning['keyDelegation'].retrieveDelegation();
          
        if (isDelegationExpired) {
          toast({
            title: "Key Delegation Expired",
            description: "Your signing key has expired. Please re-delegate your key through the profile menu.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Key Delegation Required",
            description: "Please delegate a signing key from your profile menu to post without wallet approval for each action.",
            variant: "destructive",
          });
        }
        return null;
      }
    } else {
      signedMessage = message;
    }
    
    await messageManager.sendMessage(signedMessage);
    return signedMessage;
  } catch (error) {
    console.error("Error signing and sending message:", error);
    
    let errorMessage = "Failed to sign and send message. Please try again.";
    
    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("network")) {
        errorMessage = "Network issue detected. Please check your connection and try again.";
      } else if (error.message.includes("rejected") || error.message.includes("denied")) {
        errorMessage = "Wallet signature request was rejected. Please approve signing to continue.";
      }
    }
    
    toast({
      title: "Message Error",
      description: errorMessage,
      variant: "destructive",
    });
    return null;
  }
}

export const createPost = async (
  cellId: string, 
  title: string, 
  content: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
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

    const sentMessage = await signAndSendMessage(
      postMessage,
      currentUser,
      messageSigning!,
      toast
    );
    
    if (!sentMessage) return null;
    
    updateStateFromCache();
    
    toast({
      title: "Post Created",
      description: "Your post has been published successfully.",
    });
    
    return transformPost(sentMessage);
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

export const createComment = async (
  postId: string, 
  content: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
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

    const sentMessage = await signAndSendMessage(
      commentMessage,
      currentUser,
      messageSigning!,
      toast
    );
    
    if (!sentMessage) return null;
    
    updateStateFromCache();
    
    toast({
      title: "Comment Added",
      description: "Your comment has been published.",
    });
    
    return transformComment(sentMessage);
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

export const createCell = async (
  name: string,
  description: string,
  icon: string, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
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

    const sentMessage = await signAndSendMessage(
      cellMessage,
      currentUser,
      messageSigning!,
      toast
    );
    
    if (!sentMessage) return null;
    
    updateStateFromCache();
    
    toast({
      title: "Cell Created",
      description: "Your cell has been published.",
    });
    
    return transformCell(sentMessage);
  } catch (error) {
    console.error("Error creating cell:", error);
    toast({
      title: "Cell Failed",
      description: "Failed to create cell. Please try again.",
      variant: "destructive",
    });
    return null;
  }
};

export const vote = async (
  targetId: string, 
  isUpvote: boolean, 
  currentUser: User | null, 
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
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

    const sentMessage = await signAndSendMessage(
      voteMessage,
      currentUser,
      messageSigning!,
      toast
    );
    
    if (!sentMessage) return false;
    
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

export const moderatePost = async (
  cellId: string,
  postId: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to moderate posts.",
      variant: "destructive",
    });
    return false;
  }
  if (currentUser.address !== cellOwner) {
    toast({
      title: "Not Authorized",
      description: "Only the cell admin can moderate posts.",
      variant: "destructive",
    });
    return false;
  }
  try {
    toast({
      title: "Moderating Post",
      description: "Sending moderation message to the network...",
    });
    const modMsg: ModerateMessage = {
      type: MessageType.MODERATE,
      cellId,
      targetType: 'post',
      targetId: postId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const sentMessage = await signAndSendMessage(
      modMsg,
      currentUser,
      messageSigning!,
      toast
    );
    if (!sentMessage) return false;
    updateStateFromCache();
    toast({
      title: "Post Moderated",
      description: "The post has been marked as moderated.",
    });
    return true;
  } catch (error) {
    console.error("Error moderating post:", error);
    toast({
      title: "Moderation Failed",
      description: "Failed to moderate post. Please try again.",
      variant: "destructive",
    });
    return false;
  }
};

export const moderateComment = async (
  cellId: string,
  commentId: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  messageSigning?: MessageSigning
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: "Authentication Required",
      description: "You need to verify Ordinal ownership to moderate comments.",
      variant: "destructive",
    });
    return false;
  }
  if (currentUser.address !== cellOwner) {
    toast({
      title: "Not Authorized",
      description: "Only the cell admin can moderate comments.",
      variant: "destructive",
    });
    return false;
  }
  try {
    toast({
      title: "Moderating Comment",
      description: "Sending moderation message to the network...",
    });
    const modMsg: ModerateMessage = {
      type: MessageType.MODERATE,
      cellId,
      targetType: 'comment',
      targetId: commentId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const sentMessage = await signAndSendMessage(
      modMsg,
      currentUser,
      messageSigning!,
      toast
    );
    if (!sentMessage) return false;
    updateStateFromCache();
    toast({
      title: "Comment Moderated",
      description: "The comment has been marked as moderated.",
    });
    return true;
  } catch (error) {
    console.error("Error moderating comment:", error);
    toast({
      title: "Moderation Failed",
      description: "Failed to moderate comment. Please try again.",
      variant: "destructive",
    });
    return false;
  }
}; 