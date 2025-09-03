import { useMemo } from 'react';
import { useForumData, CommentWithVoteStatus } from '@/hooks/core/useForumData';
import { useAuth } from '@/hooks/core/useEnhancedAuth';

export interface PostCommentsOptions {
  includeModerated?: boolean;
  sortBy?: 'timestamp' | 'votes';
  limit?: number;
}

export interface PostCommentsData {
  comments: CommentWithVoteStatus[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Hook for getting comments for a specific post with filtering and sorting
 */
export function usePostComments(
  postId: string | undefined,
  options: PostCommentsOptions = {}
): PostCommentsData {
  const {
    commentsByPost,
    isInitialLoading,
    postsWithVoteStatus,
    cellsWithStats,
  } = useForumData();
  const { currentUser } = useAuth();

  const { includeModerated = false, sortBy = 'timestamp', limit } = options;

  return useMemo(() => {
    if (!postId) {
      return {
        comments: [],
        totalCount: 0,
        hasMore: false,
        isLoading: isInitialLoading,
      };
    }

    let comments = commentsByPost[postId] || [];

    // Filter moderated comments unless user is admin
    if (!includeModerated) {
      const post = postsWithVoteStatus.find(p => p.id === postId);
      const cell = post ? cellsWithStats.find(c => c.id === post.cellId) : null;
      const isUserAdmin =
        currentUser && cell && currentUser.address === cell.signature;

      if (!isUserAdmin) {
        comments = comments.filter(comment => !comment.moderated);
      }
    }

    // Sort comments
    const sortedComments = [...comments].sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.voteScore - a.voteScore;

        case 'timestamp':
        default:
          return a.timestamp - b.timestamp; // Oldest first for comments
      }
    });

    // Apply limit if specified
    const limitedComments = limit
      ? sortedComments.slice(0, limit)
      : sortedComments;
    const hasMore = limit ? sortedComments.length > limit : false;

    return {
      comments: limitedComments,
      totalCount: sortedComments.length,
      hasMore,
      isLoading: isInitialLoading,
    };
  }, [
    postId,
    commentsByPost,
    isInitialLoading,
    currentUser,
    postsWithVoteStatus,
    cellsWithStats,
    includeModerated,
    sortBy,
    limit,
  ]);
}
