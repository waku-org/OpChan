import { useCallback } from 'react';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/hooks/core/useAuth';
import { usePermissions } from '@/hooks/core/usePermissions';
import { Cell, Post, Comment } from '@/types/forum';
import { useToast } from '@/components/ui/use-toast';

export interface ForumActionStates {
  isCreatingCell: boolean;
  isCreatingPost: boolean;
  isCreatingComment: boolean;
  isVoting: boolean;
  isModerating: boolean;
}

export interface ForumActions extends ForumActionStates {
  // Cell actions
  createCell: (
    name: string,
    description: string,
    icon?: string
  ) => Promise<Cell | null>;

  // Post actions
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

  // Comment actions
  createComment: (postId: string, content: string) => Promise<Comment | null>;
  voteComment: (commentId: string, isUpvote: boolean) => Promise<boolean>;
  moderateComment: (
    cellId: string,
    commentId: string,
    reason?: string
  ) => Promise<boolean>;

  // User moderation
  moderateUser: (
    cellId: string,
    userAddress: string,
    reason?: string
  ) => Promise<boolean>;

  // Data refresh
  refreshData: () => Promise<void>;
}

/**
 * Hook for forum actions with loading states and error handling
 */
export function useForumActions(): ForumActions {
  const {
    createCell: baseCreateCell,
    createPost: baseCreatePost,
    createComment: baseCreateComment,
    votePost: baseVotePost,
    voteComment: baseVoteComment,
    moderatePost: baseModeratePost,
    moderateComment: baseModerateComment,
    moderateUser: baseModerateUser,
    refreshData: baseRefreshData,
    isPostingCell,
    isPostingPost,
    isPostingComment,
    isVoting,
    getCellById,
  } = useForum();

  const { currentUser } = useAuth();
  const permissions = usePermissions();
  const { toast } = useToast();

  // Cell creation
  const createCell = useCallback(
    async (
      name: string,
      description: string,
      icon?: string
    ): Promise<Cell | null> => {
      if (!permissions.canCreateCell) {
        toast({
          title: 'Permission Denied',
          description: permissions.createCellReason,
          variant: 'destructive',
        });
        return null;
      }

      if (!name.trim() || !description.trim()) {
        toast({
          title: 'Invalid Input',
          description:
            'Please provide both a name and description for the cell.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const result = await baseCreateCell(name, description, icon);
        if (result) {
          toast({
            title: 'Cell Created',
            description: `Successfully created "${name}" cell.`,
          });
        }
        return result;
      } catch {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create cell. Please try again.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [permissions.canCreateCell, baseCreateCell, toast]
  );

  // Post creation
  const createPost = useCallback(
    async (
      cellId: string,
      title: string,
      content: string
    ): Promise<Post | null> => {
      if (!permissions.canPost) {
        toast({
          title: 'Permission Denied',
          description: 'You need to verify Ordinal ownership to create posts.',
          variant: 'destructive',
        });
        return null;
      }

      if (!title.trim() || !content.trim()) {
        toast({
          title: 'Invalid Input',
          description: 'Please provide both a title and content for the post.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const result = await baseCreatePost(cellId, title, content);
        if (result) {
          toast({
            title: 'Post Created',
            description: `Successfully created "${title}".`,
          });
        }
        return result;
      } catch {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create post. Please try again.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [permissions.canPost, baseCreatePost, toast]
  );

  // Comment creation
  const createComment = useCallback(
    async (postId: string, content: string): Promise<Comment | null> => {
      if (!permissions.canComment) {
        toast({
          title: 'Permission Denied',
          description: permissions.commentReason,
          variant: 'destructive',
        });
        return null;
      }

      if (!content.trim()) {
        toast({
          title: 'Invalid Input',
          description: 'Please provide content for the comment.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const result = await baseCreateComment(postId, content);
        if (result) {
          toast({
            title: 'Comment Created',
            description: 'Successfully posted your comment.',
          });
        }
        return result;
      } catch {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create comment. Please try again.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [permissions.canComment, baseCreateComment, toast]
  );

  // Post voting
  const votePost = useCallback(
    async (postId: string, isUpvote: boolean): Promise<boolean> => {
      if (!permissions.canVote) {
        toast({
          title: 'Permission Denied',
          description: permissions.voteReason,
          variant: 'destructive',
        });
        return false;
      }

      try {
        const result = await baseVotePost(postId, isUpvote);
        if (result) {
          toast({
            title: 'Vote Recorded',
            description: `Your ${isUpvote ? 'upvote' : 'downvote'} has been registered.`,
          });
        }
        return result;
      } catch {
        toast({
          title: 'Vote Failed',
          description: 'Failed to record your vote. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [permissions.canVote, baseVotePost, toast]
  );

  // Comment voting
  const voteComment = useCallback(
    async (commentId: string, isUpvote: boolean): Promise<boolean> => {
      if (!permissions.canVote) {
        toast({
          title: 'Permission Denied',
          description: permissions.voteReason,
          variant: 'destructive',
        });
        return false;
      }

      try {
        const result = await baseVoteComment(commentId, isUpvote);
        if (result) {
          toast({
            title: 'Vote Recorded',
            description: `Your ${isUpvote ? 'upvote' : 'downvote'} has been registered.`,
          });
        }
        return result;
      } catch {
        toast({
          title: 'Vote Failed',
          description: 'Failed to record your vote. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [permissions.canVote, baseVoteComment, toast]
  );

  // Post moderation
  const moderatePost = useCallback(
    async (
      cellId: string,
      postId: string,
      reason?: string
    ): Promise<boolean> => {
      const cell = getCellById(cellId);
      const canModerate =
        permissions.canModerate(cellId) &&
        cell &&
        currentUser?.address === cell.author;

      if (!canModerate) {
        toast({
          title: 'Permission Denied',
          description: 'You must be the cell owner to moderate content.',
          variant: 'destructive',
        });
        return false;
      }

      try {
        const result = await baseModeratePost(
          cellId,
          postId,
          reason,
          cell.author
        );
        if (result) {
          toast({
            title: 'Post Moderated',
            description: 'The post has been moderated successfully.',
          });
        }
        return result;
      } catch {
        toast({
          title: 'Moderation Failed',
          description: 'Failed to moderate post. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [permissions, currentUser, getCellById, baseModeratePost, toast]
  );

  // Comment moderation
  const moderateComment = useCallback(
    async (
      cellId: string,
      commentId: string,
      reason?: string
    ): Promise<boolean> => {
      const cell = getCellById(cellId);
      const canModerate =
        permissions.canModerate(cellId) &&
        cell &&
        currentUser?.address === cell.author;

      if (!canModerate) {
        toast({
          title: 'Permission Denied',
          description: 'You must be the cell owner to moderate content.',
          variant: 'destructive',
        });
        return false;
      }

      try {
        const result = await baseModerateComment(
          cellId,
          commentId,
          reason,
          cell.author
        );
        if (result) {
          toast({
            title: 'Comment Moderated',
            description: 'The comment has been moderated successfully.',
          });
        }
        return result;
      } catch {
        toast({
          title: 'Moderation Failed',
          description: 'Failed to moderate comment. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [permissions, currentUser, getCellById, baseModerateComment, toast]
  );

  // User moderation
  const moderateUser = useCallback(
    async (
      cellId: string,
      userAddress: string,
      reason?: string
    ): Promise<boolean> => {
      const cell = getCellById(cellId);
      const canModerate =
        permissions.canModerate(cellId) &&
        cell &&
        currentUser?.address === cell.author;

      if (!canModerate) {
        toast({
          title: 'Permission Denied',
          description: 'You must be the cell owner to moderate users.',
          variant: 'destructive',
        });
        return false;
      }

      if (userAddress === currentUser?.address) {
        toast({
          title: 'Invalid Action',
          description: 'You cannot moderate yourself.',
          variant: 'destructive',
        });
        return false;
      }

      try {
        const result = await baseModerateUser(
          cellId,
          userAddress,
          reason,
          cell.author
        );
        if (result) {
          toast({
            title: 'User Moderated',
            description: 'The user has been moderated successfully.',
          });
        }
        return result;
      } catch {
        toast({
          title: 'Moderation Failed',
          description: 'Failed to moderate user. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [permissions, currentUser, getCellById, baseModerateUser, toast]
  );

  // Data refresh
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      await baseRefreshData();
      toast({
        title: 'Data Refreshed',
        description: 'Forum data has been updated.',
      });
    } catch {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [baseRefreshData, toast]);

  return {
    // States
    isCreatingCell: isPostingCell,
    isCreatingPost: isPostingPost,
    isCreatingComment: isPostingComment,
    isVoting,
    isModerating: false, // This would need to be added to the context

    // Actions
    createCell,
    createPost,
    createComment,
    votePost,
    voteComment,
    moderatePost,
    moderateComment,
    moderateUser,
    refreshData,
  };
}
