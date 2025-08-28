import { v4 as uuidv4 } from 'uuid';
import {
  CellMessage,
  CommentMessage,
  MessageType,
  PostMessage,
  VoteMessage,
  ModerateMessage,
} from '@/lib/waku/types';
import { Cell, Comment, Post, User } from '@/types/forum';
import { transformCell, transformComment, transformPost } from './transformers';
import { MessageService, AuthService, CryptoService } from '@/lib/identity/services';

type ToastFunction = (props: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

/* ------------------------------------------------------------------
   POST / COMMENT / CELL CREATION
-------------------------------------------------------------------*/

export const createPost = async (
  cellId: string,
  title: string,
  content: string,
  currentUser: User | null,
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  authService?: AuthService,
): Promise<Post | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: 'Authentication Required',
      description: 'You need to connect your wallet to post.',
      variant: 'destructive',
    });
    return null;
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(currentUser.ensOwnership || currentUser.ordinalOwnership);
  const isVerified = currentUser.verificationStatus === 'verified-owner' || 
                     currentUser.verificationStatus === 'verified-basic' || 
                     hasENSOrOrdinal;
  
  if (!isVerified && (currentUser.verificationStatus === 'unverified' || currentUser.verificationStatus === 'verifying')) {
    toast({
      title: 'Verification Required',
      description: 'Please complete wallet verification to post.',
      variant: 'destructive',
    });
    return null;
  }

  try {
    toast({ title: 'Creating post', description: 'Sending your post to the network...' });

    const postId = uuidv4();
    const postMessage: PostMessage = {
      type: MessageType.POST,
      id: postId,
      cellId,
      title,
      content,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(postMessage);
    if (!result.success) {
      toast({
        title: 'Post Failed',
        description: result.error || 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
      return null;
    }

    updateStateFromCache();
    toast({ title: 'Post Created', description: 'Your post has been published successfully.' });
    return transformPost(result.message! as PostMessage);
  } catch (error) {
    console.error('Error creating post:', error);
    toast({
      title: 'Post Failed',
      description: 'Failed to create post. Please try again.',
      variant: 'destructive',
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
  authService?: AuthService,
): Promise<Comment | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: 'Authentication Required',
      description: 'You need to connect your wallet to comment.',
      variant: 'destructive',
    });
    return null;
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(currentUser.ensOwnership || currentUser.ordinalOwnership);
  const isVerified = currentUser.verificationStatus === 'verified-owner' || 
                     currentUser.verificationStatus === 'verified-basic' || 
                     hasENSOrOrdinal;
  
  if (!isVerified && (currentUser.verificationStatus === 'unverified' || currentUser.verificationStatus === 'verifying')) {
    toast({
      title: 'Verification Required',
      description: 'Please complete wallet verification to comment.',
      variant: 'destructive',
    });
    return null;
  }

  try {
    toast({ title: 'Posting comment', description: 'Sending your comment to the network...' });

    const commentId = uuidv4();
    const commentMessage: CommentMessage = {
      type: MessageType.COMMENT,
      id: commentId,
      postId,
      content,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(commentMessage);
    if (!result.success) {
      toast({
        title: 'Comment Failed',
        description: result.error || 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
      return null;
    }

    updateStateFromCache();
    toast({ title: 'Comment Added', description: 'Your comment has been published.' });
    return transformComment(result.message! as CommentMessage);
  } catch (error) {
    console.error('Error creating comment:', error);
    toast({
      title: 'Comment Failed',
      description: 'Failed to add comment. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

export const createCell = async (
  name: string,
  description: string,
  icon: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  authService?: AuthService,
): Promise<Cell | null> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: 'Authentication Required',
      description: 'You need to verify Ordinal ownership to create a cell.',
      variant: 'destructive',
    });
    return null;
  }

  try {
    toast({ title: 'Creating cell', description: 'Sending your cell to the network...' });

    const cellId = uuidv4();
    const cellMessage: CellMessage = {
      type: MessageType.CELL,
      id: cellId,
      name,
      description,
      ...(icon && { icon }),
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(cellMessage);
    if (!result.success) {
      toast({
        title: 'Cell Failed',
        description: result.error || 'Failed to create cell. Please try again.',
        variant: 'destructive',
      });
      return null;
    }

    updateStateFromCache();
    toast({ title: 'Cell Created', description: 'Your cell has been published.' });
    return transformCell(result.message! as CellMessage);
  } catch (error) {
    console.error('Error creating cell:', error);
    toast({
      title: 'Cell Failed',
      description: 'Failed to create cell. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

/* ------------------------------------------------------------------
   VOTING
-------------------------------------------------------------------*/

export const vote = async (
  targetId: string,
  isUpvote: boolean,
  currentUser: User | null,
  isAuthenticated: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  authService?: AuthService,
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: 'Authentication Required',
      description: 'You need to connect your wallet to vote.',
      variant: 'destructive',
    });
    return false;
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(currentUser.ensOwnership || currentUser.ordinalOwnership);
  const isVerified = currentUser.verificationStatus === 'verified-owner' || 
                     currentUser.verificationStatus === 'verified-basic' || 
                     hasENSOrOrdinal;
  
  if (!isVerified && (currentUser.verificationStatus === 'unverified' || currentUser.verificationStatus === 'verifying')) {
    toast({
      title: 'Verification Required',
      description: 'Please complete wallet verification to vote.',
      variant: 'destructive',
    });
    return false;
  }

  try {
    const voteType = isUpvote ? 'upvote' : 'downvote';
    toast({ title: `Sending ${voteType}`, description: 'Recording your vote on the network...' });

    const voteId = uuidv4();
    const voteMessage: VoteMessage = {
      type: MessageType.VOTE,
      id: voteId,
      targetId,
      value: isUpvote ? 1 : -1,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(voteMessage);
    if (!result.success) {
      toast({
        title: 'Vote Failed',
        description: result.error || 'Failed to register your vote. Please try again.',
        variant: 'destructive',
      });
      return false;
    }

    updateStateFromCache();
    toast({ title: 'Vote Recorded', description: `Your ${voteType} has been registered.` });
    return true;
  } catch (error) {
    console.error('Error voting:', error);
    toast({
      title: 'Vote Failed',
      description: 'Failed to register your vote. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};

/* ------------------------------------------------------------------
   MODERATION
-------------------------------------------------------------------*/

export const moderatePost = async (
  cellId: string,
  postId: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  authService?: AuthService,
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({
      title: 'Authentication Required',
      description: 'You need to verify Ordinal ownership to moderate posts.',
      variant: 'destructive',
    });
    return false;
  }
  if (currentUser.address !== cellOwner) {
    toast({ title: 'Not Authorized', description: 'Only the cell admin can moderate posts.', variant: 'destructive' });
    return false;
  }

  try {
    toast({ title: 'Moderating Post', description: 'Sending moderation message to the network...' });

    const modMsg: ModerateMessage = {
      type: MessageType.MODERATE,
      cellId,
      targetType: 'post',
      targetId: postId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(modMsg);
    if (!result.success) {
      toast({ title: 'Moderation Failed', description: result.error || 'Failed to moderate post. Please try again.', variant: 'destructive' });
      return false;
    }

    updateStateFromCache();
    toast({ title: 'Post Moderated', description: 'The post has been marked as moderated.' });
    return true;
  } catch (error) {
    console.error('Error moderating post:', error);
    toast({ title: 'Moderation Failed', description: 'Failed to moderate post. Please try again.', variant: 'destructive' });
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
  authService?: AuthService,
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({ title: 'Authentication Required', description: 'You need to verify Ordinal ownership to moderate comments.', variant: 'destructive' });
    return false;
  }
  if (currentUser.address !== cellOwner) {
    toast({ title: 'Not Authorized', description: 'Only the cell admin can moderate comments.', variant: 'destructive' });
    return false;
  }

  try {
    toast({ title: 'Moderating Comment', description: 'Sending moderation message to the network...' });

    const modMsg: ModerateMessage = {
      type: MessageType.MODERATE,
      cellId,
      targetType: 'comment',
      targetId: commentId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const cryptoService = new CryptoService();
    const messageService = new MessageService(authService!, cryptoService);
    const result = await messageService.sendMessage(modMsg);
    if (!result.success) {
      toast({ title: 'Moderation Failed', description: result.error || 'Failed to moderate comment. Please try again.', variant: 'destructive' });
      return false;
    }

    updateStateFromCache();
    toast({ title: 'Comment Moderated', description: 'The comment has been marked as moderated.' });
    return true;
  } catch (error) {
    console.error('Error moderating comment:', error);
    toast({ title: 'Moderation Failed', description: 'Failed to moderate comment. Please try again.', variant: 'destructive' });
    return false;
  }
};

export const moderateUser = async (
  cellId: string,
  userAddress: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  authService?: AuthService,
): Promise<boolean> => {
  if (!isAuthenticated || !currentUser) {
    toast({ title: 'Authentication Required', description: 'You need to verify Ordinal ownership to moderate users.', variant: 'destructive' });
    return false;
  }
  if (currentUser.address !== cellOwner) {
    toast({ title: 'Not Authorized', description: 'Only the cell admin can moderate users.', variant: 'destructive' });
    return false;
  }

  const modMsg: ModerateMessage = {
    type: MessageType.MODERATE,
    cellId,
    targetType: 'user',
    targetId: userAddress,
    reason,
    author: currentUser.address,
    timestamp: Date.now(),
    signature: '',
    browserPubKey: currentUser.browserPubKey,
  };
  const cryptoService = new CryptoService();
  const messageService = new MessageService(authService!, cryptoService);
  const result = await messageService.sendMessage(modMsg);
  if (!result.success) {
    toast({ title: 'Moderation Failed', description: result.error || 'Failed to moderate user. Please try again.', variant: 'destructive' });
    return false;
  }

  updateStateFromCache();
  toast({ title: 'User Moderated', description: `User ${userAddress} has been moderated in this cell.` });
  return true;
};
