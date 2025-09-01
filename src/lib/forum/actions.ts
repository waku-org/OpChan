import { v4 as uuidv4 } from 'uuid';
import {
  MessageType,
  UnsignedCellMessage,
  UnsignedCommentMessage,
  UnsignedPostMessage,
  UnsignedVoteMessage,
  UnsignedModerateMessage,
  CellMessage,
  CommentMessage,
  PostMessage,
} from '@/types/waku';
import { Cell, Comment, Post } from '@/types/forum';
import { EVerificationStatus, User } from '@/types/identity';
import { transformCell, transformComment, transformPost } from './transformers';
import { MessageService, CryptoService } from '@/lib/services';

// Result types for action functions
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/* ------------------------------------------------------------------
   POST / COMMENT / CELL CREATION
-------------------------------------------------------------------*/

interface PostCreationParams {
  cellId: string;
  title: string;
  content: string;
  currentUser: User | null;
  isAuthenticated: boolean;
}

export const createPost = async (
  { cellId, title, content, currentUser, isAuthenticated }: PostCreationParams,
  updateStateFromCache: () => void
): Promise<ActionResult<Post>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to connect your wallet to post.',
    };
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(
    currentUser.ensDetails || currentUser.ordinalDetails
  );
  const isVerified =
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_OWNER ||
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_BASIC ||
    hasENSOrOrdinal;

  if (
    !isVerified &&
    (currentUser.verificationStatus === EVerificationStatus.UNVERIFIED ||
      currentUser.verificationStatus === EVerificationStatus.VERIFYING)
  ) {
    return {
      success: false,
      error:
        'Verification required. Please complete wallet verification to post.',
    };
  }

  try {
    const postId = uuidv4();
    const postMessage: UnsignedPostMessage = {
      type: MessageType.POST,
      id: postId,
      cellId,
      title,
      content,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(postMessage);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create post. Please try again.',
      };
    }

    updateStateFromCache();
    const transformedPost = transformPost(result.message! as PostMessage);
    if (!transformedPost) {
      return {
        success: false,
        error: 'Failed to transform post data.',
      };
    }
    return {
      success: true,
      data: transformedPost,
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      error: 'Failed to create post. Please try again.',
    };
  }
};

export const createComment = async (
  postId: string,
  content: string,
  currentUser: User | null,
  isAuthenticated: boolean,
  updateStateFromCache: () => void
): Promise<ActionResult<Comment>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to connect your wallet to comment.',
    };
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(
    currentUser.ensDetails || currentUser.ordinalDetails
  );
  const isVerified =
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_OWNER ||
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_BASIC ||
    hasENSOrOrdinal;

  if (
    !isVerified &&
    (currentUser.verificationStatus === EVerificationStatus.UNVERIFIED ||
      currentUser.verificationStatus === EVerificationStatus.VERIFYING)
  ) {
    return {
      success: false,
      error:
        'Verification required. Please complete wallet verification to comment.',
    };
  }

  try {
    const commentId = uuidv4();
    const commentMessage: UnsignedCommentMessage = {
      type: MessageType.COMMENT,
      id: commentId,
      postId,
      content,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(commentMessage);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to add comment. Please try again.',
      };
    }

    updateStateFromCache();
    const transformedComment = transformComment(
      result.message! as CommentMessage
    );
    if (!transformedComment) {
      return {
        success: false,
        error: 'Failed to transform comment data.',
      };
    }
    return {
      success: true,
      data: transformedComment,
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    return {
      success: false,
      error: 'Failed to add comment. Please try again.',
    };
  }
};

export const createCell = async (
  name: string,
  description: string,
  icon: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  updateStateFromCache: () => void
): Promise<ActionResult<Cell>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to verify Ordinal ownership to create a cell.',
    };
  }

  try {
    const cellId = uuidv4();
    const cellMessage: UnsignedCellMessage = {
      type: MessageType.CELL,
      id: cellId,
      name,
      description,
      ...(icon && { icon }),
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(cellMessage);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create cell. Please try again.',
      };
    }

    updateStateFromCache();
    const transformedCell = transformCell(result.message! as CellMessage);
    if (!transformedCell) {
      return {
        success: false,
        error: 'Failed to transform cell data.',
      };
    }
    return {
      success: true,
      data: transformedCell,
    };
  } catch (error) {
    console.error('Error creating cell:', error);
    return {
      success: false,
      error: 'Failed to create cell. Please try again.',
    };
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
  updateStateFromCache: () => void
): Promise<ActionResult<boolean>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to connect your wallet to vote.',
    };
  }

  // Check if user has basic verification or better, or owns ENS/Ordinal
  const hasENSOrOrdinal = !!(
    currentUser.ensDetails || currentUser.ordinalDetails
  );
  const isVerified =
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_OWNER ||
    currentUser.verificationStatus === EVerificationStatus.VERIFIED_BASIC ||
    hasENSOrOrdinal;

  if (
    !isVerified &&
    (currentUser.verificationStatus === EVerificationStatus.UNVERIFIED ||
      currentUser.verificationStatus === EVerificationStatus.VERIFYING)
  ) {
    return {
      success: false,
      error:
        'Verification required. Please complete wallet verification to vote.',
    };
  }

  try {
    const voteId = uuidv4();
    const voteMessage: UnsignedVoteMessage = {
      type: MessageType.VOTE,
      id: voteId,
      targetId,
      value: isUpvote ? 1 : -1,
      timestamp: Date.now(),
      author: currentUser.address,
    };

    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(voteMessage);
    if (!result.success) {
      return {
        success: false,
        error:
          result.error || 'Failed to register your vote. Please try again.',
      };
    }

    updateStateFromCache();
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('Error voting:', error);
    return {
      success: false,
      error: 'Failed to register your vote. Please try again.',
    };
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
  updateStateFromCache: () => void
): Promise<ActionResult<boolean>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to verify Ordinal ownership to moderate posts.',
    };
  }
  if (currentUser.address !== cellOwner) {
    return {
      success: false,
      error: 'Not authorized. Only the cell admin can moderate posts.',
    };
  }

  try {
    const modMsg: UnsignedModerateMessage = {
      type: MessageType.MODERATE,
      id: uuidv4(),
      cellId,
      targetType: 'post',
      targetId: postId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(modMsg);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to moderate post. Please try again.',
      };
    }

    updateStateFromCache();
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('Error moderating post:', error);
    return {
      success: false,
      error: 'Failed to moderate post. Please try again.',
    };
  }
};

export const moderateComment = async (
  cellId: string,
  commentId: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  updateStateFromCache: () => void
): Promise<ActionResult<boolean>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to verify Ordinal ownership to moderate comments.',
    };
  }
  if (currentUser.address !== cellOwner) {
    return {
      success: false,
      error: 'Not authorized. Only the cell admin can moderate comments.',
    };
  }

  try {
    const modMsg: UnsignedModerateMessage = {
      type: MessageType.MODERATE,
      id: uuidv4(),
      cellId,
      targetType: 'comment',
      targetId: commentId,
      reason,
      timestamp: Date.now(),
      author: currentUser.address,
    };
    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(modMsg);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to moderate comment. Please try again.',
      };
    }

    updateStateFromCache();
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('Error moderating comment:', error);
    return {
      success: false,
      error: 'Failed to moderate comment. Please try again.',
    };
  }
};

export const moderateUser = async (
  cellId: string,
  userAddress: string,
  reason: string | undefined,
  currentUser: User | null,
  isAuthenticated: boolean,
  cellOwner: string,
  updateStateFromCache: () => void
): Promise<ActionResult<boolean>> => {
  if (!isAuthenticated || !currentUser) {
    return {
      success: false,
      error:
        'Authentication required. You need to verify Ordinal ownership to moderate users.',
    };
  }
  if (currentUser.address !== cellOwner) {
    return {
      success: false,
      error: 'Not authorized. Only the cell admin can moderate users.',
    };
  }

  try {
    const modMsg: UnsignedModerateMessage = {
      type: MessageType.MODERATE,
      id: uuidv4(),
      cellId,
      targetType: 'user',
      targetId: userAddress,
      reason,
      author: currentUser.address,
      timestamp: Date.now(),
    };
    const cryptoService = new CryptoService();
    const messageService = new MessageService(cryptoService);
    const result = await messageService.sendMessage(modMsg);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to moderate user. Please try again.',
      };
    }

    updateStateFromCache();
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('Error moderating user:', error);
    return {
      success: false,
      error: 'Failed to moderate user. Please try again.',
    };
  }
};
