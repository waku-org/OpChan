import { useMemo } from 'react';
import { useForumData } from '@/hooks/core/useForumData';
import { useAuth } from '@/hooks/core/useAuth';

export interface UserVoteData {
  // Vote status for specific items
  hasVotedOnPost: (postId: string) => boolean;
  hasVotedOnComment: (commentId: string) => boolean;
  getPostVoteType: (postId: string) => 'upvote' | 'downvote' | null;
  getCommentVoteType: (commentId: string) => 'upvote' | 'downvote' | null;

  // User's voting history
  votedPosts: Set<string>;
  votedComments: Set<string>;
  upvotedPosts: Set<string>;
  downvotedPosts: Set<string>;
  upvotedComments: Set<string>;
  downvotedComments: Set<string>;

  // Statistics
  totalVotes: number;
  upvoteRatio: number;
}

/**
 * Hook for getting user's voting status and history
 */
export function useUserVotes(userAddress?: string): UserVoteData {
  const { postsWithVoteStatus, commentsWithVoteStatus } = useForumData();
  const { currentUser } = useAuth();

  const targetAddress = userAddress || currentUser?.address;

  return useMemo(() => {
    if (!targetAddress) {
      return {
        hasVotedOnPost: () => false,
        hasVotedOnComment: () => false,
        getPostVoteType: () => null,
        getCommentVoteType: () => null,
        votedPosts: new Set(),
        votedComments: new Set(),
        upvotedPosts: new Set(),
        downvotedPosts: new Set(),
        upvotedComments: new Set(),
        downvotedComments: new Set(),
        totalVotes: 0,
        upvoteRatio: 0,
      };
    }

    // Build vote sets
    const votedPosts = new Set<string>();
    const votedComments = new Set<string>();
    const upvotedPosts = new Set<string>();
    const downvotedPosts = new Set<string>();
    const upvotedComments = new Set<string>();
    const downvotedComments = new Set<string>();

    // Analyze post votes
    postsWithVoteStatus.forEach(post => {
      const hasUpvoted = post.upvotes.some(
        vote => vote.author === targetAddress
      );
      const hasDownvoted = post.downvotes.some(
        vote => vote.author === targetAddress
      );

      if (hasUpvoted) {
        votedPosts.add(post.id);
        upvotedPosts.add(post.id);
      }
      if (hasDownvoted) {
        votedPosts.add(post.id);
        downvotedPosts.add(post.id);
      }
    });

    // Analyze comment votes
    commentsWithVoteStatus.forEach(comment => {
      const hasUpvoted = comment.upvotes.some(
        vote => vote.author === targetAddress
      );
      const hasDownvoted = comment.downvotes.some(
        vote => vote.author === targetAddress
      );

      if (hasUpvoted) {
        votedComments.add(comment.id);
        upvotedComments.add(comment.id);
      }
      if (hasDownvoted) {
        votedComments.add(comment.id);
        downvotedComments.add(comment.id);
      }
    });

    // Calculate statistics
    const totalVotes = votedPosts.size + votedComments.size;
    const totalUpvotes = upvotedPosts.size + upvotedComments.size;
    const upvoteRatio = totalVotes > 0 ? totalUpvotes / totalVotes : 0;

    // Helper functions
    const hasVotedOnPost = (postId: string): boolean => {
      return votedPosts.has(postId);
    };

    const hasVotedOnComment = (commentId: string): boolean => {
      return votedComments.has(commentId);
    };

    const getPostVoteType = (postId: string): 'upvote' | 'downvote' | null => {
      if (upvotedPosts.has(postId)) return 'upvote';
      if (downvotedPosts.has(postId)) return 'downvote';
      return null;
    };

    const getCommentVoteType = (
      commentId: string
    ): 'upvote' | 'downvote' | null => {
      if (upvotedComments.has(commentId)) return 'upvote';
      if (downvotedComments.has(commentId)) return 'downvote';
      return null;
    };

    return {
      hasVotedOnPost,
      hasVotedOnComment,
      getPostVoteType,
      getCommentVoteType,
      votedPosts,
      votedComments,
      upvotedPosts,
      downvotedPosts,
      upvotedComments,
      downvotedComments,
      totalVotes,
      upvoteRatio,
    };
  }, [postsWithVoteStatus, commentsWithVoteStatus, targetAddress]);
}
