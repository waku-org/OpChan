import { useMemo } from 'react';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/contexts/useAuth';
import { useModeration } from '@/contexts/ModerationContext';
import { Cell, Post, Comment, UserVerificationStatus } from 'opchan-core/types/forum';
import { EVerificationStatus } from 'opchan-core/types/identity';

export interface CellWithStats extends Cell {
  postCount: number;
  activeUsers: number;
  recentActivity: number;
}

export interface PostWithVoteStatus extends Post {
  userUpvoted: boolean;
  userDownvoted: boolean;
  voteScore: number;
  canVote: boolean;
  canModerate: boolean;
}

export interface CommentWithVoteStatus extends Comment {
  userUpvoted: boolean;
  userDownvoted: boolean;
  voteScore: number;
  canVote: boolean;
  canModerate: boolean;
}

export interface ForumData {
  // Raw data
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  userVerificationStatus: UserVerificationStatus;

  // Loading states
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isNetworkConnected: boolean;
  error: string | null;

  // Computed data with reactive updates
  cellsWithStats: CellWithStats[];
  postsWithVoteStatus: PostWithVoteStatus[];
  commentsWithVoteStatus: CommentWithVoteStatus[];

  // Filtered data based on moderation settings
  filteredPosts: PostWithVoteStatus[];
  filteredComments: CommentWithVoteStatus[];
  filteredCellsWithStats: CellWithStats[];
  filteredCommentsByPost: Record<string, CommentWithVoteStatus[]>;

  // Organized data
  postsByCell: Record<string, PostWithVoteStatus[]>;
  commentsByPost: Record<string, CommentWithVoteStatus[]>;

  // User-specific data
  userVotedPosts: Set<string>;
  userVotedComments: Set<string>;
  userCreatedPosts: Set<string>;
  userCreatedComments: Set<string>;
}

/**
 * Main forum data hook with reactive updates and computed properties
 * This is the primary data source for all forum-related information
 */
export function useForumData(): ForumData {
  const {
    cells,
    posts,
    comments,
    userVerificationStatus,
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    error,
  } = useForum();

  const { currentUser } = useAuth();
  const { showModerated } = useModeration();

  // Compute cells with statistics
  const cellsWithStats = useMemo((): CellWithStats[] => {
    return cells.map(cell => {
      const cellPosts = posts.filter(post => post.cellId === cell.id);
      const recentPosts = cellPosts.filter(
        post => Date.now() - post.timestamp < 7 * 24 * 60 * 60 * 1000 // 7 days
      );

      const uniqueAuthors = new Set(cellPosts.map(post => post.author));

      return {
        ...cell,
        postCount: cellPosts.length,
        activeUsers: uniqueAuthors.size,
        recentActivity: recentPosts.length,
      };
    });
  }, [cells, posts]);

  // Helper function to check if user can vote
  const canUserVote = useMemo(() => {
    if (!currentUser) return false;

    return (
      currentUser.verificationStatus ===
        EVerificationStatus.ENS_ORDINAL_VERIFIED ||
      currentUser.verificationStatus === EVerificationStatus.WALLET_CONNECTED ||
      Boolean(currentUser.ensDetails) ||
      Boolean(currentUser.ordinalDetails)
    );
  }, [currentUser]);

  // Helper function to check if user can moderate in a cell
  const canUserModerate = useMemo(() => {
    const moderationMap: Record<string, boolean> = {};

    if (!currentUser) return moderationMap;

    cells.forEach(cell => {
      moderationMap[cell.id] = currentUser.address === cell.signature;
    });

    return moderationMap;
  }, [currentUser, cells]);

  // Compute posts with vote status
  const postsWithVoteStatus = useMemo((): PostWithVoteStatus[] => {
    return posts.map(post => {
      const userUpvoted = currentUser
        ? post.upvotes.some(vote => vote.author === currentUser.address)
        : false;

      const userDownvoted = currentUser
        ? post.downvotes.some(vote => vote.author === currentUser.address)
        : false;

      const voteScore = post.upvotes.length - post.downvotes.length;
      const canModerate = canUserModerate[post.cellId] || false;

      return {
        ...post,
        userUpvoted,
        userDownvoted,
        voteScore,
        canVote: canUserVote,
        canModerate,
      };
    });
  }, [posts, currentUser, canUserVote, canUserModerate]);

  // Compute comments with vote status
  const commentsWithVoteStatus = useMemo((): CommentWithVoteStatus[] => {
    return comments.map(comment => {
      const userUpvoted = currentUser
        ? comment.upvotes.some(vote => vote.author === currentUser.address)
        : false;

      const userDownvoted = currentUser
        ? comment.downvotes.some(vote => vote.author === currentUser.address)
        : false;

      const voteScore = comment.upvotes.length - comment.downvotes.length;

      // Find the post to determine cell for moderation
      const parentPost = posts.find(post => post.id === comment.postId);
      const canModerate = parentPost
        ? canUserModerate[parentPost.cellId] || false
        : false;

      return {
        ...comment,
        userUpvoted,
        userDownvoted,
        voteScore,
        canVote: canUserVote,
        canModerate,
      };
    });
  }, [comments, currentUser, canUserVote, canUserModerate, posts]);

  // Organize posts by cell
  const postsByCell = useMemo((): Record<string, PostWithVoteStatus[]> => {
    const organized: Record<string, PostWithVoteStatus[]> = {};

    postsWithVoteStatus.forEach(post => {
      if (!organized[post.cellId]) {
        organized[post.cellId] = [];
      }
      const cellPosts = organized[post.cellId];
      if (cellPosts) {
        cellPosts.push(post);
      }
    });

    // Sort posts within each cell by relevance score or timestamp
    Object.keys(organized).forEach(cellId => {
      const cellPosts = organized[cellId];
      if (cellPosts) {
        cellPosts.sort((a, b) => {
          if (
            a.relevanceScore !== undefined &&
            b.relevanceScore !== undefined
          ) {
            return b.relevanceScore - a.relevanceScore;
          }
          return b.timestamp - a.timestamp;
        });
      }
    });

    return organized;
  }, [postsWithVoteStatus]);

  // Organize comments by post
  const commentsByPost = useMemo((): Record<
    string,
    CommentWithVoteStatus[]
  > => {
    const organized: Record<string, CommentWithVoteStatus[]> = {};

    commentsWithVoteStatus.forEach(comment => {
      if (!organized[comment.postId]) {
        organized[comment.postId] = [];
      }
      const postComments = organized[comment.postId];
      if (postComments) {
        postComments.push(comment);
      }
    });

    // Sort comments within each post by timestamp (oldest first)
    Object.keys(organized).forEach(postId => {
      const postComments = organized[postId];
      if (postComments) {
        postComments.sort((a, b) => a.timestamp - b.timestamp);
      }
    });

    return organized;
  }, [commentsWithVoteStatus]);

  // User-specific data sets
  const userVotedPosts = useMemo(() => {
    const votedPosts = new Set<string>();
    if (!currentUser) return votedPosts;

    postsWithVoteStatus.forEach(post => {
      if (post.userUpvoted || post.userDownvoted) {
        votedPosts.add(post.id);
      }
    });

    return votedPosts;
  }, [postsWithVoteStatus, currentUser]);

  const userVotedComments = useMemo(() => {
    const votedComments = new Set<string>();
    if (!currentUser) return votedComments;

    commentsWithVoteStatus.forEach(comment => {
      if (comment.userUpvoted || comment.userDownvoted) {
        votedComments.add(comment.id);
      }
    });

    return votedComments;
  }, [commentsWithVoteStatus, currentUser]);

  const userCreatedPosts = useMemo(() => {
    const createdPosts = new Set<string>();
    if (!currentUser) return createdPosts;

    posts.forEach(post => {
      if (post.author === currentUser.address) {
        createdPosts.add(post.id);
      }
    });

    return createdPosts;
  }, [posts, currentUser]);

  const userCreatedComments = useMemo(() => {
    const createdComments = new Set<string>();
    if (!currentUser) return createdComments;

    comments.forEach(comment => {
      if (comment.author === currentUser.address) {
        createdComments.add(comment.id);
      }
    });

    return createdComments;
  }, [comments, currentUser]);

  // Filtered data based on moderation settings
  const filteredPosts = useMemo(() => {
    return showModerated
      ? postsWithVoteStatus
      : postsWithVoteStatus.filter(post => !post.moderated);
  }, [postsWithVoteStatus, showModerated]);

  const filteredComments = useMemo(() => {
    if (showModerated) return commentsWithVoteStatus;

    // Hide moderated comments AND comments whose parent post is moderated
    const moderatedPostIds = new Set(
      postsWithVoteStatus.filter(p => p.moderated).map(p => p.id)
    );

    return commentsWithVoteStatus.filter(
      comment => !comment.moderated && !moderatedPostIds.has(comment.postId)
    );
  }, [commentsWithVoteStatus, postsWithVoteStatus, showModerated]);

  // Filtered cells with stats based on filtered posts
  const filteredCellsWithStats = useMemo((): CellWithStats[] => {
    return cells.map(cell => {
      const cellPosts = filteredPosts.filter(post => post.cellId === cell.id);
      const recentPosts = cellPosts.filter(
        post => Date.now() - post.timestamp < 7 * 24 * 60 * 60 * 1000 // 7 days
      );

      const uniqueAuthors = new Set(cellPosts.map(post => post.author));

      return {
        ...cell,
        postCount: cellPosts.length,
        activeUsers: uniqueAuthors.size,
        recentActivity: recentPosts.length,
      };
    });
  }, [cells, filteredPosts]);

  // Filtered comments organized by post
  const filteredCommentsByPost = useMemo((): Record<
    string,
    CommentWithVoteStatus[]
  > => {
    const organized: Record<string, CommentWithVoteStatus[]> = {};

    filteredComments.forEach(comment => {
      if (!organized[comment.postId]) {
        organized[comment.postId] = [];
      }
      organized[comment.postId]!.push(comment);
    });

    return organized;
  }, [filteredComments]);

  return {
    // Raw data
    cells,
    posts,
    comments,
    userVerificationStatus,

    // Loading states
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    error,

    // Computed data
    cellsWithStats,
    postsWithVoteStatus,
    commentsWithVoteStatus,

    // Filtered data based on moderation settings
    filteredPosts,
    filteredComments,
    filteredCellsWithStats,
    filteredCommentsByPost,

    // Organized data
    postsByCell,
    commentsByPost,

    // User-specific data
    userVotedPosts,
    userVotedComments,
    userCreatedPosts,
    userCreatedComments,
  };
}
