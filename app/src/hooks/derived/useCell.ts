import { useMemo } from 'react';
import { useForumData, CellWithStats } from '@/hooks/core/useForumData';
import { useAuth } from '@/hooks/core/useAuth';
import { EVerificationStatus } from '@opchan/core';

export interface CellData extends CellWithStats {
  posts: Array<{
    id: string;
    title: string;
    content: string;
    author: string;
    timestamp: number;
    voteScore: number;
    commentCount: number;
  }>;
  isUserAdmin: boolean;
  canModerate: boolean;
  canPost: boolean;
}

/**
 * Hook for getting a specific cell with its posts and permissions
 */
export function useCell(cellId: string | undefined): CellData | null {
  const { cellsWithStats, postsByCell, commentsByPost } = useForumData();
  const { currentUser } = useAuth();

  return useMemo(() => {
    if (!cellId) return null;

    const cell = cellsWithStats.find(c => c.id === cellId);
    if (!cell) return null;

    const cellPosts = postsByCell[cellId] || [];

    // Transform posts to include comment count
    const posts = cellPosts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author,
      timestamp: post.timestamp,
      voteScore: post.voteScore,
      commentCount: (commentsByPost[post.id] || []).length,
    }));

    // Check user permissions
    const isUserAdmin = currentUser
      ? currentUser.address === cell.signature
      : false;
    const canModerate = isUserAdmin;
    const canPost = currentUser
      ? currentUser.verificationStatus ===
          EVerificationStatus.ENS_ORDINAL_VERIFIED ||
        currentUser.verificationStatus ===
          EVerificationStatus.WALLET_CONNECTED ||
        Boolean(currentUser.ensDetails) ||
        Boolean(currentUser.ordinalDetails)
      : false;

    return {
      ...cell,
      posts,
      isUserAdmin,
      canModerate,
      canPost,
    };
  }, [cellId, cellsWithStats, postsByCell, commentsByPost, currentUser]);
}
