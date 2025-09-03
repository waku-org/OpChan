import { useMemo } from 'react';
import {
  useForumData,
  PostWithVoteStatus,
  CommentWithVoteStatus,
} from '@/hooks/core/useForumData';
import { useAuth } from '@/hooks/core/useEnhancedAuth';

export interface PostData extends PostWithVoteStatus {
  cell: {
    id: string;
    name: string;
    description: string;
  } | null;
  comments: CommentWithVoteStatus[];
  commentCount: number;
  isUserAuthor: boolean;
}

/**
 * Hook for getting a specific post with its comments and metadata
 */
export function usePost(postId: string | undefined): PostData | null {
  const { postsWithVoteStatus, commentsByPost, cellsWithStats } =
    useForumData();
  const { currentUser } = useAuth();

  return useMemo(() => {
    if (!postId) return null;

    const post = postsWithVoteStatus.find(p => p.id === postId);
    if (!post) return null;

    const cell = cellsWithStats.find(c => c.id === post.cellId) || null;
    const comments = commentsByPost[postId] || [];
    const commentCount = comments.length;
    const isUserAuthor = currentUser
      ? currentUser.address === post.author
      : false;

    return {
      ...post,
      cell: cell
        ? {
            id: cell.id,
            name: cell.name,
            description: cell.description,
          }
        : null,
      comments,
      commentCount,
      isUserAuthor,
    };
  }, [
    postId,
    postsWithVoteStatus,
    commentsByPost,
    cellsWithStats,
    currentUser,
  ]);
}
