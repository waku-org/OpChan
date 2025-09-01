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

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class ForumActions {
  private cryptoService: CryptoService;
  private messageService: MessageService;

  constructor(cryptoService?: CryptoService) {
    this.cryptoService = cryptoService || new CryptoService();
    this.messageService = new MessageService(this.cryptoService);
  }

  /* ------------------------------------------------------------------
     POST / COMMENT / CELL CREATION
  -------------------------------------------------------------------*/

  async createPost(
    params: PostCreationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<Post>> {
    const { cellId, title, content, currentUser, isAuthenticated } = params;

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

      const result = await this.messageService.sendMessage(postMessage);
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
  }

  async createComment(
    params: CommentCreationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<Comment>> {
    const { postId, content, currentUser, isAuthenticated } = params;

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

      const result = await this.messageService.sendMessage(commentMessage);
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
  }

  async createCell(
    params: CellCreationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<Cell>> {
    const { name, description, icon, currentUser, isAuthenticated } = params;

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

      const result = await this.messageService.sendMessage(cellMessage);
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
  }

  /* ------------------------------------------------------------------
     VOTING
  -------------------------------------------------------------------*/

  async vote(
    params: VoteParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<boolean>> {
    const { targetId, isUpvote, currentUser, isAuthenticated } = params;

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

      const result = await this.messageService.sendMessage(voteMessage);
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
  }

  /* ------------------------------------------------------------------
     MODERATION
  -------------------------------------------------------------------*/

  async moderatePost(
    params: PostModerationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<boolean>> {
    const { cellId, postId, reason, currentUser, isAuthenticated, cellOwner } =
      params;

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

      const result = await this.messageService.sendMessage(modMsg);
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
  }

  async moderateComment(
    params: CommentModerationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<boolean>> {
    const {
      cellId,
      commentId,
      reason,
      currentUser,
      isAuthenticated,
      cellOwner,
    } = params;

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

      const result = await this.messageService.sendMessage(modMsg);
      if (!result.success) {
        return {
          success: false,
          error:
            result.error || 'Failed to moderate comment. Please try again.',
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
  }

  async moderateUser(
    params: UserModerationParams,
    updateStateFromCache: () => void
  ): Promise<ActionResult<boolean>> {
    const {
      cellId,
      userAddress,
      reason,
      currentUser,
      isAuthenticated,
      cellOwner,
    } = params;

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

      const result = await this.messageService.sendMessage(modMsg);
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
  }
}

// Base interface for all actions that require user authentication
interface BaseActionParams {
  currentUser: User | null;
  isAuthenticated: boolean;
}

// Parameter interfaces for all action methods
interface PostCreationParams extends BaseActionParams {
  cellId: string;
  title: string;
  content: string;
}

interface CommentCreationParams extends BaseActionParams {
  postId: string;
  content: string;
}

interface CellCreationParams extends BaseActionParams {
  name: string;
  description: string;
  icon?: string;
}

interface VoteParams extends BaseActionParams {
  targetId: string;
  isUpvote: boolean;
}

interface PostModerationParams extends BaseActionParams {
  cellId: string;
  postId: string;
  reason?: string;
  cellOwner: string;
}

interface CommentModerationParams extends BaseActionParams {
  cellId: string;
  commentId: string;
  reason?: string;
  cellOwner: string;
}

interface UserModerationParams extends BaseActionParams {
  cellId: string;
  userAddress: string;
  reason?: string;
  cellOwner: string;
}
