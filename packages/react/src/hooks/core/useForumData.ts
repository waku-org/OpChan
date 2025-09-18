import { useMemo } from 'react';
import { useForum } from '../../contexts/ForumContext';
import { useAuth } from '../../contexts/AuthContext';
import { useModeration } from '../../contexts/ModerationContext';
import {
  Cell,
  Post,
  Comment,
  UserVerificationStatus,
  EVerificationStatus,
} from '@opchan/core';

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

  const cellsWithStats = useMemo((): CellWithStats[] => {
    return cells.map(cell => {
      const cellPosts = posts.filter(post => post.cellId === cell.id);
      const recentPosts = cellPosts.filter(
        post => Date.now() - post.timestamp < 7 * 24 * 60 * 60 * 1000
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

  const canUserVote = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED ||
      currentUser.verificationStatus === EVerificationStatus.WALLET_CONNECTED ||
      Boolean(currentUser.ensDetails) ||
      Boolean(currentUser.ordinalDetails)
    );
  }, [currentUser]);

  const canUserModerate = useMemo(() => {
    const moderationMap: Record<string, boolean> = {};
    if (!currentUser) return moderationMap;
    cells.forEach(cell => {
      moderationMap[cell.id] = currentUser.address === (cell as unknown as { signature?: string }).signature;
    });
    return moderationMap;
  }, [currentUser, cells]);

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

  const commentsWithVoteStatus = useMemo((): CommentWithVoteStatus[] => {
    return comments.map(comment => {
      const userUpvoted = currentUser
        ? comment.upvotes.some(vote => vote.author === currentUser.address)
        : false;
      const userDownvoted = currentUser
        ? comment.downvotes.some(vote => vote.author === currentUser.address)
        : false;
      const voteScore = comment.upvotes.length - comment.downvotes.length;
    
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

  const postsByCell = useMemo((): Record<string, PostWithVoteStatus[]> => {
    const organized: Record<string, PostWithVoteStatus[]> = {};
    postsWithVoteStatus.forEach(post => {
      if (!organized[post.cellId]) organized[post.cellId] = [];
      organized[post.cellId]!.push(post);
    });
    Object.keys(organized).forEach(cellId => {
      const list = organized[cellId]!;
      list.sort((a, b) => {
        if (
          a.relevanceScore !== undefined &&
          b.relevanceScore !== undefined
        ) {
          return b.relevanceScore - a.relevanceScore;
        }
        return b.timestamp - a.timestamp;
      });
    });
    return organized;
  }, [postsWithVoteStatus]);

  const commentsByPost = useMemo((): Record<string, CommentWithVoteStatus[]> => {
    const organized: Record<string, CommentWithVoteStatus[]> = {};
    commentsWithVoteStatus.forEach(comment => {
      if (!organized[comment.postId]) organized[comment.postId] = [];
      organized[comment.postId]!.push(comment);
    });
    Object.keys(organized).forEach(postId => {
      const list = organized[postId]!;
      list.sort((a, b) => a.timestamp - b.timestamp);
    });
    return organized;
  }, [commentsWithVoteStatus]);

  const userVotedPosts = useMemo(() => {
    const voted = new Set<string>();
    if (!currentUser) return voted;
    postsWithVoteStatus.forEach(post => {
      if (post.userUpvoted || post.userDownvoted) voted.add(post.id);
    });
    return voted;
  }, [postsWithVoteStatus, currentUser]);

  const userVotedComments = useMemo(() => {
    const voted = new Set<string>();
    if (!currentUser) return voted;
    commentsWithVoteStatus.forEach(comment => {
      if (comment.userUpvoted || comment.userDownvoted) voted.add(comment.id);
    });
    return voted;
  }, [commentsWithVoteStatus, currentUser]);

  const userCreatedPosts = useMemo(() => {
    const created = new Set<string>();
    if (!currentUser) return created;
    posts.forEach(post => {
      if (post.author === currentUser.address) created.add(post.id);
    });
    return created;
  }, [posts, currentUser]);

  const userCreatedComments = useMemo(() => {
    const created = new Set<string>();
    if (!currentUser) return created;
    comments.forEach(comment => {
      if (comment.author === currentUser.address) created.add(comment.id);
    });
    return created;
  }, [comments, currentUser]);

  const filteredPosts = useMemo(() => {
    return showModerated
      ? postsWithVoteStatus
      : postsWithVoteStatus.filter(p => !p.moderated);
  }, [postsWithVoteStatus, showModerated]);

  const filteredComments = useMemo(() => {
    if (showModerated) return commentsWithVoteStatus;
    const moderatedPostIds = new Set(
      postsWithVoteStatus.filter(p => p.moderated).map(p => p.id)
    );
    return commentsWithVoteStatus.filter(
      c => !c.moderated && !moderatedPostIds.has(c.postId)
    );
  }, [commentsWithVoteStatus, postsWithVoteStatus, showModerated]);

  const filteredCellsWithStats = useMemo((): CellWithStats[] => {
    return cells.map(cell => {
      const cellPosts = filteredPosts.filter(post => post.cellId === cell.id);
      const recentPosts = cellPosts.filter(
        post => Date.now() - post.timestamp < 7 * 24 * 60 * 60 * 1000
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

  const filteredCommentsByPost = useMemo((): Record<string, CommentWithVoteStatus[]> => {
    const organized: Record<string, CommentWithVoteStatus[]> = {};
    filteredComments.forEach(comment => {
      if (!organized[comment.postId]) organized[comment.postId] = [];
      organized[comment.postId]!.push(comment);
    });
    return organized;
  }, [filteredComments]);

  return {
    cells,
    posts,
    comments,
    userVerificationStatus,
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    error,
    cellsWithStats,
    postsWithVoteStatus,
    commentsWithVoteStatus,
    filteredPosts,
    filteredComments,
    filteredCellsWithStats,
    filteredCommentsByPost,
    postsByCell,
    commentsByPost,
    userVotedPosts,
    userVotedComments,
    userCreatedPosts,
    userCreatedComments,
  };
}


