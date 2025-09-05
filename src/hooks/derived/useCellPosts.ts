import { useMemo } from 'react';
import { useForumData, PostWithVoteStatus } from '@/hooks/core/useForumData';
import { useAuth } from '@/hooks/core/useAuth';

export interface CellPostsOptions {
  includeModerated?: boolean;
  sortBy?: 'relevance' | 'timestamp' | 'votes';
  limit?: number;
}

export interface CellPostsData {
  posts: PostWithVoteStatus[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Hook for getting posts for a specific cell with filtering and sorting
 */
export function useCellPosts(
  cellId: string | undefined,
  options: CellPostsOptions = {}
): CellPostsData {
  const { postsByCell, isInitialLoading, cellsWithStats } = useForumData();
  const { currentUser } = useAuth();

  const { includeModerated = false, sortBy = 'relevance', limit } = options;

  return useMemo(() => {
    if (!cellId) {
      return {
        posts: [],
        totalCount: 0,
        hasMore: false,
        isLoading: isInitialLoading,
      };
    }

    let posts = postsByCell[cellId] || [];

    // Filter moderated posts unless user is admin
    if (!includeModerated) {
      const cell = cellsWithStats.find(c => c.id === cellId);
      const isUserAdmin =
        currentUser && cell && currentUser.address === cell.signature;

      if (!isUserAdmin) {
        posts = posts.filter(post => !post.moderated);
      }
    }

    // Sort posts
    const sortedPosts = [...posts].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          if (
            a.relevanceScore !== undefined &&
            b.relevanceScore !== undefined
          ) {
            return b.relevanceScore - a.relevanceScore;
          }
          return b.timestamp - a.timestamp;

        case 'votes':
          return b.voteScore - a.voteScore;

        case 'timestamp':
        default:
          return b.timestamp - a.timestamp;
      }
    });

    // Apply limit if specified
    const limitedPosts = limit ? sortedPosts.slice(0, limit) : sortedPosts;
    const hasMore = limit ? sortedPosts.length > limit : false;

    return {
      posts: limitedPosts,
      totalCount: sortedPosts.length,
      hasMore,
      isLoading: isInitialLoading,
    };
  }, [
    cellId,
    postsByCell,
    isInitialLoading,
    currentUser,
    cellsWithStats,
    includeModerated,
    sortBy,
    limit,
  ]);
}
