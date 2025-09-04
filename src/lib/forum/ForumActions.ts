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
import { DelegationManager } from '@/lib/delegation';
import { localDatabase } from '@/lib/database/LocalDatabase';
import messageManager from '@/lib/waku';

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class ForumActions {
  private delegationManager: DelegationManager;

  constructor(delegationManager?: DelegationManager) {
    this.delegationManager = delegationManager || new DelegationManager();
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
      const unsignedPost: UnsignedPostMessage = {
        type: MessageType.POST,
        id: postId,
        cellId,
        title,
        content,
        timestamp: Date.now(),
        author: currentUser.address,
      };

      const signed = this.delegationManager.signMessage(unsignedPost);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      const transformedPost = await transformPost(signed as PostMessage);
      if (!transformedPost) {
        return { success: false, error: 'Failed to transform post data.' };
      }
      return { success: true, data: transformedPost };
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
      const unsignedComment: UnsignedCommentMessage = {
        type: MessageType.COMMENT,
        id: commentId,
        postId,
        content,
        timestamp: Date.now(),
        author: currentUser.address,
      };

      // Optimistic path: sign locally, write to cache, mark pending, render immediately
      const signed = this.delegationManager.signMessage(unsignedComment);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      // Write immediately to LocalDatabase and reflect in UI
      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      // Fire-and-forget network send; LocalDatabase will clear pending on ack
      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      const transformed = await transformComment(signed as CommentMessage);
      if (!transformed) {
        return { success: false, error: 'Failed to transform comment data.' };
      }

      return { success: true, data: transformed };
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
      const unsignedCell: UnsignedCellMessage = {
        type: MessageType.CELL,
        id: cellId,
        name,
        description,
        ...(icon && { icon }),
        timestamp: Date.now(),
        author: currentUser.address,
      };

      const signed = this.delegationManager.signMessage(unsignedCell);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      const transformedCell = await transformCell(signed as CellMessage);
      if (!transformedCell) {
        return { success: false, error: 'Failed to transform cell data.' };
      }
      return { success: true, data: transformedCell };
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
      const unsignedVote: UnsignedVoteMessage = {
        type: MessageType.VOTE,
        id: voteId,
        targetId,
        value: isUpvote ? 1 : -1,
        timestamp: Date.now(),
        author: currentUser.address,
      };

      const signed = this.delegationManager.signMessage(unsignedVote);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      return { success: true, data: true };
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
      const unsignedMod: UnsignedModerateMessage = {
        type: MessageType.MODERATE,
        id: uuidv4(),
        cellId,
        targetType: 'post',
        targetId: postId,
        reason,
        timestamp: Date.now(),
        author: currentUser.address,
      };

      const signed = this.delegationManager.signMessage(unsignedMod);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      return { success: true, data: true };
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
      const unsignedMod: UnsignedModerateMessage = {
        type: MessageType.MODERATE,
        id: uuidv4(),
        cellId,
        targetType: 'comment',
        targetId: commentId,
        reason,
        timestamp: Date.now(),
        author: currentUser.address,
      };

      const signed = this.delegationManager.signMessage(unsignedMod);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      return { success: true, data: true };
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
      const unsignedMod: UnsignedModerateMessage = {
        type: MessageType.MODERATE,
        id: uuidv4(),
        cellId,
        targetType: 'user',
        targetId: userAddress,
        reason,
        author: currentUser.address,
        timestamp: Date.now(),
      };

      const signed = this.delegationManager.signMessage(unsignedMod);
      if (!signed) {
        const status = this.delegationManager.getStatus(
          currentUser.address,
          currentUser.walletType
        );
        return {
          success: false,
          error: status.isValid
            ? 'Key delegation required. Please delegate a signing key from your profile menu.'
            : 'Key delegation expired. Please re-delegate your key through the profile menu.',
        };
      }

      await localDatabase.updateCache(signed);
      localDatabase.markPending(signed.id);
      localDatabase.setSyncing(true);
      updateStateFromCache();

      messageManager
        .sendMessage(signed)
        .catch(err => console.error('Background send failed:', err))
        .finally(() => localDatabase.setSyncing(false));

      return { success: true, data: true };
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
