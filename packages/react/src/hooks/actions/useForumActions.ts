import { useCallback } from 'react';
import { useForum } from '../../contexts/ForumContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../core/usePermissions';
import { Cell, Post, Comment } from '@opchan/core';

export interface ForumActionStates {
  isCreatingCell: boolean;
  isCreatingPost: boolean;
  isCreatingComment: boolean;
  isVoting: boolean;
  isModerating: boolean;
}

export interface ForumActions extends ForumActionStates {
  createCell: (
    name: string,
    description: string,
    icon?: string
  ) => Promise<Cell | null>;

  createPost: (
    cellId: string,
    title: string,
    content: string
  ) => Promise<Post | null>;
  votePost: (postId: string, isUpvote: boolean) => Promise<boolean>;
  moderatePost: (
    cellId: string,
    postId: string,
    reason?: string
  ) => Promise<boolean>;
  unmoderatePost: (
    cellId: string,
    postId: string,
    reason?: string
  ) => Promise<boolean>;

  createComment: (postId: string, content: string) => Promise<Comment | null>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  moderateComment: (
    cellId: string,
    commentId: string,
    reason?: string
  ) => Promise<boolean>;
  unmoderateComment: (
    cellId: string,
    commentId: string,
    reason?: string
  ) => Promise<boolean>;

  moderateUser: (
    cellId: string,
    userAddress: string,
    reason?: string
  ) => Promise<boolean>;
  unmoderateUser: (
    cellId: string,
    userAddress: string,
    reason?: string
  ) => Promise<boolean>;

  refreshData: () => Promise<void>;
}

export function useForumActions(): ForumActions {
  const { actions, refreshData } = useForum();
  const { currentUser } = useAuth();
  const permissions = usePermissions();

  const createCell = useCallback(
    async (
      name: string,
      description: string,
      icon?: string
    ): Promise<Cell | null> => {
      if (!permissions.canCreateCell) {
        throw new Error(permissions.createCellReason);
      }

      if (!name.trim() || !description.trim()) {
        throw new Error('Please provide both a name and description for the cell.');
      }

      try {
        const result = await actions.createCell(
          {
            name,
            description,
            icon,
            currentUser,
            isAuthenticated: !!currentUser,
          },
          async () => {} // updateStateFromCache handled by ForumProvider
        );
        return result.data || null;
      } catch {
        throw new Error('Failed to create cell. Please try again.');
      }
    },
    [permissions.canCreateCell, permissions.createCellReason, actions, currentUser]
  );

  const createPost = useCallback(
    async (
      cellId: string,
      title: string,
      content: string
    ): Promise<Post | null> => {
      if (!permissions.canPost) {
        throw new Error('You need to verify Ordinal ownership to create posts.');
      }

      if (!title.trim() || !content.trim()) {
        throw new Error('Please provide both a title and content for the post.');
      }

      try {
        const result = await actions.createPost(
          {
            cellId,
            title,
            content,
            currentUser,
            isAuthenticated: !!currentUser,
          },
          async () => {}
        );
        return result.data || null;
      } catch {
        throw new Error('Failed to create post. Please try again.');
      }
    },
    [permissions.canPost, actions, currentUser]
  );

  const createComment = useCallback(
    async (postId: string, content: string): Promise<Comment | null> => {
      if (!permissions.canComment) {
        throw new Error(permissions.commentReason);
      }

      if (!content.trim()) {
        throw new Error('Please provide content for the comment.');
      }

      try {
        const result = await actions.createComment(
          {
            postId,
            content,
            currentUser,
            isAuthenticated: !!currentUser,
          },
          async () => {}
        );
        return result.data || null;
      } catch {
        throw new Error('Failed to create comment. Please try again.');
      }
    },
    [permissions.canComment, permissions.commentReason, actions, currentUser]
  );

  const votePost = useCallback(
    async (postId: string, isUpvote: boolean): Promise<boolean> => {
      if (!permissions.canVote) {
        throw new Error(permissions.voteReason);
      }

      try {
        const result = await actions.vote(
          {
            targetId: postId,
            isUpvote,
            currentUser,
            isAuthenticated: !!currentUser,
          },
          async () => {}
        );
        return result.success;
      } catch {
        throw new Error('Failed to record your vote. Please try again.');
      }
    },
    [permissions.canVote, permissions.voteReason, actions, currentUser]
  );

  const voteComment = useCallback(
    async (commentId: string, isUpvote: boolean): Promise<boolean> => {
      if (!permissions.canVote) {
        throw new Error(permissions.voteReason);
      }

      try {
        const result = await actions.vote(
          {
            targetId: commentId,
            isUpvote,
            currentUser,
            isAuthenticated: !!currentUser,
          },
          async () => {}
        );
        return result.success;
      } catch {
        throw new Error('Failed to record your vote. Please try again.');
      }
    },
    [permissions.canVote, permissions.voteReason, actions, currentUser]
  );

  // For now, return simple implementations - moderation actions would need cell owner checks
  const moderatePost = useCallback(
    async (cellId: string, postId: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.moderatePost(
          {
            cellId,
            postId,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  const unmoderatePost = useCallback(
    async (cellId: string, postId: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.unmoderatePost(
          {
            cellId,
            postId,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  const moderateComment = useCallback(
    async (cellId: string, commentId: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.moderateComment(
          {
            cellId,
            commentId,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  const unmoderateComment = useCallback(
    async (cellId: string, commentId: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.unmoderateComment(
          {
            cellId,
            commentId,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  const moderateUser = useCallback(
    async (cellId: string, userAddress: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.moderateUser(
          {
            cellId,
            userAddress,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  const unmoderateUser = useCallback(
    async (cellId: string, userAddress: string, reason?: string): Promise<boolean> => {
      try {
        const result = await actions.unmoderateUser(
          {
            cellId,
            userAddress,
            reason,
            currentUser,
            isAuthenticated: !!currentUser,
            cellOwner: currentUser?.address || '',
          },
          async () => {}
        );
        return result.success;
      } catch {
        return false;
      }
    },
    [actions, currentUser]
  );

  return {
    // States - simplified for now
    isCreatingCell: false,
    isCreatingPost: false,
    isCreatingComment: false,
    isVoting: false,
    isModerating: false,

    // Actions
    createCell,
    createPost,
    createComment,
    votePost,
    voteComment,
    moderatePost,
    unmoderatePost,
    moderateComment,
    unmoderateComment,
    moderateUser,
    unmoderateUser,
    refreshData,
  };
}
