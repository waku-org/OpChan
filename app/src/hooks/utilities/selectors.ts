import { useMemo } from 'react';
import { ForumData } from '@/hooks/core/useForumData';
import { Cell, Post, Comment } from '@/types/forum';
import { EVerificationStatus } from '@/types/identity';

// Selector types for different data slices
export type CellSelector<T> = (cells: Cell[]) => T;
export type PostSelector<T> = (posts: Post[]) => T;
export type CommentSelector<T> = (comments: Comment[]) => T;

// Common selector patterns
export interface ForumSelectors {
  // Cell selectors
  selectCellsByActivity: () => Cell[];
  selectCellsByMemberCount: () => Cell[];
  selectCellsByRelevance: () => Cell[];
  selectCellById: (id: string) => Cell | null;
  selectCellsByOwner: (ownerAddress: string) => Cell[];

  // Post selectors
  selectPostsByCell: (cellId: string) => Post[];
  selectPostsByAuthor: (authorAddress: string) => Post[];
  selectPostsByVoteScore: (minScore?: number) => Post[];
  selectTrendingPosts: (timeframe?: number) => Post[];
  selectRecentPosts: (limit?: number) => Post[];
  selectPostById: (id: string) => Post | null;

  // Comment selectors
  selectCommentsByPost: (postId: string) => Comment[];
  selectCommentsByAuthor: (authorAddress: string) => Comment[];
  selectRecentComments: (limit?: number) => Comment[];
  selectCommentById: (id: string) => Comment | null;

  // User-specific selectors
  selectUserPosts: (userAddress: string) => Post[];
  selectUserComments: (userAddress: string) => Comment[];
  selectUserActivity: (userAddress: string) => {
    posts: Post[];
    comments: Comment[];
  };
  selectVerifiedUsers: () => string[];
  selectActiveUsers: (timeframe?: number) => string[];

  // Search and filter selectors
  searchPosts: (query: string) => Post[];
  searchComments: (query: string) => Comment[];
  searchCells: (query: string) => Cell[];
  filterByVerification: (
    items: (Post | Comment)[],
    level: EVerificationStatus
  ) => (Post | Comment)[];

  // Aggregation selectors
  selectStats: () => {
    totalCells: number;
    totalPosts: number;
    totalComments: number;
    totalUsers: number;
    verifiedUsers: number;
  };
}

/**
 * Hook providing optimized selectors for forum data
 */
export function useForumSelectors(forumData: ForumData): ForumSelectors {
  const {
    cells,
    postsWithVoteStatus: posts,
    commentsWithVoteStatus: comments,
    userVerificationStatus,
  } = forumData;

  // Cell selectors
  const selectCellsByActivity = useMemo(() => {
    return (): Cell[] => {
      return [...cells].sort((a, b) => {
        const aActivity =
          'recentActivity' in b ? (b.recentActivity as number) : 0;
        const bActivity =
          'recentActivity' in a ? (a.recentActivity as number) : 0;
        return aActivity - bActivity;
      });
    };
  }, [cells]);

  const selectCellsByMemberCount = useMemo(() => {
    return (): Cell[] => {
      return [...cells].sort(
        (a, b) => (b.activeMemberCount || 0) - (a.activeMemberCount || 0)
      );
    };
  }, [cells]);

  const selectCellsByRelevance = useMemo(() => {
    return (): Cell[] => {
      return [...cells].sort(
        (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );
    };
  }, [cells]);

  const selectCellById = useMemo(() => {
    return (id: string): Cell | null => {
      return cells.find(cell => cell.id === id) || null;
    };
  }, [cells]);

  const selectCellsByOwner = useMemo(() => {
    return (ownerAddress: string): Cell[] => {
      return cells.filter(cell => cell.signature === ownerAddress);
    };
  }, [cells]);

  // Post selectors
  const selectPostsByCell = useMemo(() => {
    return (cellId: string): Post[] => {
      return posts.filter(post => post.cellId === cellId);
    };
  }, [posts]);

  const selectPostsByAuthor = useMemo(() => {
    return (authorAddress: string): Post[] => {
      return posts.filter(post => post.author === authorAddress);
    };
  }, [posts]);

  const selectPostsByVoteScore = useMemo(() => {
    return (minScore: number = 0): Post[] => {
      return posts.filter(post => post.voteScore >= minScore);
    };
  }, [posts]);

  const selectTrendingPosts = useMemo(() => {
    return (timeframe: number = 7 * 24 * 60 * 60 * 1000): Post[] => {
      // 7 days default
      const cutoff = Date.now() - timeframe;
      return posts
        .filter(post => post.timestamp > cutoff)
        .sort((a, b) => {
          // Sort by relevance score if available, otherwise by vote score
          if (
            a.relevanceScore !== undefined &&
            b.relevanceScore !== undefined
          ) {
            return b.relevanceScore - a.relevanceScore;
          }
          return b.voteScore - a.voteScore;
        });
    };
  }, [posts]);

  const selectRecentPosts = useMemo(() => {
    return (limit: number = 10): Post[] => {
      return [...posts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    };
  }, [posts]);

  const selectPostById = useMemo(() => {
    return (id: string): Post | null => {
      return posts.find(post => post.id === id) || null;
    };
  }, [posts]);

  // Comment selectors
  const selectCommentsByPost = useMemo(() => {
    return (postId: string): Comment[] => {
      return comments.filter(comment => comment.postId === postId);
    };
  }, [comments]);

  const selectCommentsByAuthor = useMemo(() => {
    return (authorAddress: string): Comment[] => {
      return comments.filter(comment => comment.author === authorAddress);
    };
  }, [comments]);

  const selectRecentComments = useMemo(() => {
    return (limit: number = 10): Comment[] => {
      return [...comments]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    };
  }, [comments]);

  const selectCommentById = useMemo(() => {
    return (id: string): Comment | null => {
      return comments.find(comment => comment.id === id) || null;
    };
  }, [comments]);

  // User-specific selectors
  const selectUserPosts = useMemo(() => {
    return (userAddress: string): Post[] => {
      return posts.filter(post => post.author === userAddress);
    };
  }, [posts]);

  const selectUserComments = useMemo(() => {
    return (userAddress: string): Comment[] => {
      return comments.filter(comment => comment.author === userAddress);
    };
  }, [comments]);

  const selectUserActivity = useMemo(() => {
    return (userAddress: string) => {
      return {
        posts: posts.filter(post => post.author === userAddress),
        comments: comments.filter(comment => comment.author === userAddress),
      };
    };
  }, [posts, comments]);

  const selectVerifiedUsers = useMemo(() => {
    return (): string[] => {
      return Object.entries(userVerificationStatus)
        .filter(([_, status]) => status.isVerified)
        .map(([address]) => address);
    };
  }, [userVerificationStatus]);

  const selectActiveUsers = useMemo(() => {
    return (timeframe: number = 7 * 24 * 60 * 60 * 1000): string[] => {
      // 7 days default
      const cutoff = Date.now() - timeframe;
      const activeUsers = new Set<string>();

      posts.forEach(post => {
        if (post.timestamp > cutoff) {
          activeUsers.add(post.author);
        }
      });

      comments.forEach(comment => {
        if (comment.timestamp > cutoff) {
          activeUsers.add(comment.author);
        }
      });

      return Array.from(activeUsers);
    };
  }, [posts, comments]);

  // Search selectors
  const searchPosts = useMemo(() => {
    return (query: string): Post[] => {
      const lowerQuery = query.toLowerCase();
      return posts.filter(
        post =>
          post.title.toLowerCase().includes(lowerQuery) ||
          post.content.toLowerCase().includes(lowerQuery)
      );
    };
  }, [posts]);

  const searchComments = useMemo(() => {
    return (query: string): Comment[] => {
      const lowerQuery = query.toLowerCase();
      return comments.filter(comment =>
        comment.content.toLowerCase().includes(lowerQuery)
      );
    };
  }, [comments]);

  const searchCells = useMemo(() => {
    return (query: string): Cell[] => {
      const lowerQuery = query.toLowerCase();
      return cells.filter(
        cell =>
          cell.name.toLowerCase().includes(lowerQuery) ||
          cell.description.toLowerCase().includes(lowerQuery)
      );
    };
  }, [cells]);

  const filterByVerification = useMemo(() => {
    return (
      items: (Post | Comment)[],
      level: EVerificationStatus
    ): (Post | Comment)[] => {
      return items.filter(item => {
        const userStatus = userVerificationStatus[item.author];
        return userStatus?.verificationStatus === level;
      });
    };
  }, [userVerificationStatus]);

  // Aggregation selectors
  const selectStats = useMemo(() => {
    return () => {
      const uniqueUsers = new Set([
        ...posts.map(post => post.author),
        ...comments.map(comment => comment.author),
      ]);

      const verifiedUsers = Object.values(userVerificationStatus).filter(
        status => status.isVerified
      ).length;

      return {
        totalCells: cells.length,
        totalPosts: posts.length,
        totalComments: comments.length,
        totalUsers: uniqueUsers.size,
        verifiedUsers,
      };
    };
  }, [cells, posts, comments, userVerificationStatus]);

  return {
    selectCellsByActivity,
    selectCellsByMemberCount,
    selectCellsByRelevance,
    selectCellById,
    selectCellsByOwner,
    selectPostsByCell,
    selectPostsByAuthor,
    selectPostsByVoteScore,
    selectTrendingPosts,
    selectRecentPosts,
    selectPostById,
    selectCommentsByPost,
    selectCommentsByAuthor,
    selectRecentComments,
    selectCommentById,
    selectUserPosts,
    selectUserComments,
    selectUserActivity,
    selectVerifiedUsers,
    selectActiveUsers,
    searchPosts,
    searchComments,
    searchCells,
    filterByVerification,
    selectStats,
  };
}
