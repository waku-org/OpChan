import { Cell, Post, Comment } from '@/types/forum';
import {
  CellMessage,
  CommentMessage,
  PostMessage,
  VoteMessage,
} from '@/types/waku';
import messageManager from '@/lib/waku';
import { RelevanceCalculator } from './RelevanceCalculator';
import { UserVerificationStatus } from '@/types/forum';
// Validation is enforced at ingestion time by LocalDatabase. Transformers assume
// cache contains only valid, verified messages.

export const transformCell = async (
  cellMessage: CellMessage,
  _verifyMessage?: unknown,
  userVerificationStatus?: UserVerificationStatus,
  posts?: Post[]
): Promise<Cell | null> => {
  // Message validity already enforced upstream

  const transformedCell: Cell = {
    id: cellMessage.id,
    type: cellMessage.type,
    author: cellMessage.author,
    name: cellMessage.name,
    description: cellMessage.description,
    icon: cellMessage.icon || '',
    timestamp: cellMessage.timestamp,
    signature: cellMessage.signature,
    browserPubKey: cellMessage.browserPubKey,
  };

  // Calculate relevance score if user verification status and posts are provided
  if (userVerificationStatus && posts) {
    const relevanceCalculator = new RelevanceCalculator();

    const relevanceResult = relevanceCalculator.calculateCellScore(
      transformedCell,
      posts
    );

    // Calculate active member count
    const cellPosts = posts.filter(post => post.cellId === cellMessage.id);
    const activeMembers = new Set<string>();
    cellPosts.forEach(post => {
      activeMembers.add(post.authorAddress);
    });

    return {
      ...transformedCell,
      relevanceScore: relevanceResult.score,
      activeMemberCount: activeMembers.size,
      relevanceDetails: relevanceResult.details,
    };
  }

  return transformedCell;
};

export const transformPost = async (
  postMessage: PostMessage,
  _verifyMessage?: unknown,
  userVerificationStatus?: UserVerificationStatus
): Promise<Post | null> => {
  // Message validity already enforced upstream

  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === postMessage.id
  );
  // Votes in cache are already validated; just map
  const filteredVotes = votes;
  const upvotes = filteredVotes.filter(
    (vote): vote is VoteMessage => vote !== null && vote.value === 1
  );
  const downvotes = filteredVotes.filter(
    (vote): vote is VoteMessage => vote !== null && vote.value === -1
  );

  const modMsg = messageManager.messageCache.moderations[postMessage.id];
  const isPostModerated = !!modMsg && modMsg.targetType === 'post';
  const userModMsg = Object.values(
    messageManager.messageCache.moderations
  ).find(
    m =>
      m.targetType === 'user' &&
      m.cellId === postMessage.cellId &&
      m.targetId === postMessage.author
  );
  const isUserModerated = !!userModMsg;

  const transformedPost: Post = {
    id: postMessage.id,
    type: postMessage.type,
    author: postMessage.author,
    cellId: postMessage.cellId,
    authorAddress: postMessage.author,
    title: postMessage.title,
    content: postMessage.content,
    timestamp: postMessage.timestamp,
    signature: postMessage.signature,
    browserPubKey: postMessage.browserPubKey,
    upvotes,
    downvotes,
    moderated: isPostModerated || isUserModerated,
    moderatedBy: isPostModerated
      ? modMsg.author
      : isUserModerated
        ? userModMsg!.author
        : undefined,
    moderationReason: isPostModerated
      ? modMsg.reason
      : isUserModerated
        ? userModMsg!.reason
        : undefined,
    moderationTimestamp: isPostModerated
      ? modMsg.timestamp
      : isUserModerated
        ? userModMsg!.timestamp
        : undefined,
    // mark pending for optimistic UI if not yet acknowledged
    // not persisted as a field; UI can check via LocalDatabase
  };

  // Calculate relevance score if user verification status is provided
  if (userVerificationStatus) {
    const relevanceCalculator = new RelevanceCalculator();

    // Get comments for this post
    const comments = await Promise.all(
      Object.values(messageManager.messageCache.comments).map(comment =>
        transformComment(comment, undefined, userVerificationStatus)
      )
    ).then(comments =>
      comments.filter((comment): comment is Comment => comment !== null)
    );
    const postComments = comments.filter(
      comment => comment.postId === postMessage.id
    );

    const relevanceResult = relevanceCalculator.calculatePostScore(
      transformedPost,
      filteredVotes,
      postComments,
      userVerificationStatus
    );

    const relevanceScore = relevanceResult.score;

    // Calculate verified upvotes and commenters
    const verifiedUpvotes = upvotes.filter(vote => {
      const voterStatus = userVerificationStatus[vote.author];
      return voterStatus?.isVerified;
    }).length;

    const verifiedCommenters = new Set<string>();
    postComments.forEach(comment => {
      const commenterStatus = userVerificationStatus[comment.authorAddress];
      if (commenterStatus?.isVerified) {
        verifiedCommenters.add(comment.authorAddress);
      }
    });

    return {
      ...transformedPost,
      relevanceScore,
      verifiedUpvotes,
      verifiedCommenters: Array.from(verifiedCommenters),
      relevanceDetails: relevanceResult.details,
    };
  }

  return transformedPost;
};

export const transformComment = async (
  commentMessage: CommentMessage,
  _verifyMessage?: unknown,
  userVerificationStatus?: UserVerificationStatus
): Promise<Comment | null> => {
  // Message validity already enforced upstream
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === commentMessage.id
  );
  // Votes in cache are already validated
  const filteredVotes = votes;
  const upvotes = filteredVotes.filter(
    (vote): vote is VoteMessage => vote !== null && vote.value === 1
  );
  const downvotes = filteredVotes.filter(
    (vote): vote is VoteMessage => vote !== null && vote.value === -1
  );

  const modMsg = messageManager.messageCache.moderations[commentMessage.id];
  const isCommentModerated = !!modMsg && modMsg.targetType === 'comment';
  const userModMsg = Object.values(
    messageManager.messageCache.moderations
  ).find(
    m =>
      m.targetType === 'user' &&
      m.cellId === commentMessage.postId.split('-')[0] &&
      m.targetId === commentMessage.author
  );
  const isUserModerated = !!userModMsg;

  const transformedComment: Comment = {
    id: commentMessage.id,
    type: commentMessage.type,
    author: commentMessage.author,
    postId: commentMessage.postId,
    authorAddress: commentMessage.author,
    content: commentMessage.content,
    timestamp: commentMessage.timestamp,
    signature: commentMessage.signature,
    browserPubKey: commentMessage.browserPubKey,
    upvotes,
    downvotes,
    moderated: isCommentModerated || isUserModerated,
    moderatedBy: isCommentModerated
      ? modMsg.author
      : isUserModerated
        ? userModMsg!.author
        : undefined,
    moderationReason: isCommentModerated
      ? modMsg.reason
      : isUserModerated
        ? userModMsg!.reason
        : undefined,
    moderationTimestamp: isCommentModerated
      ? modMsg.timestamp
      : isUserModerated
        ? userModMsg!.timestamp
        : undefined,
    // mark pending for optimistic UI via LocalDatabase lookup
  };

  // Calculate relevance score if user verification status is provided
  if (userVerificationStatus) {
    const relevanceCalculator = new RelevanceCalculator();

    const relevanceResult = relevanceCalculator.calculateCommentScore(
      transformedComment,
      filteredVotes.filter((vote): vote is VoteMessage => vote !== null),
      userVerificationStatus
    );

    return {
      ...transformedComment,
      relevanceScore: relevanceResult.score,
      relevanceDetails: relevanceResult.details,
    };
  }

  return transformedComment;
};

export const transformVote = async (
  voteMessage: VoteMessage,
  _verifyMessage?: unknown
): Promise<VoteMessage | null> => {
  // Message validity already enforced upstream

  return voteMessage;
};

export const getDataFromCache = async (
  _verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
  userVerificationStatus?: UserVerificationStatus
): Promise<{ cells: Cell[]; posts: Post[]; comments: Comment[] }> => {
  // First transform posts and comments to get relevance scores
  // All validation is now handled internally by the transform functions
  const posts = await Promise.all(
    Object.values(messageManager.messageCache.posts).map(post =>
      transformPost(post, undefined, userVerificationStatus)
    )
  ).then(posts => posts.filter((post): post is Post => post !== null));

  const comments = await Promise.all(
    Object.values(messageManager.messageCache.comments).map(c =>
      transformComment(c, undefined, userVerificationStatus)
    )
  ).then(comments =>
    comments.filter((comment): comment is Comment => comment !== null)
  );

  // Then transform cells with posts for relevance calculation
  const cells = await Promise.all(
    Object.values(messageManager.messageCache.cells).map(cell =>
      transformCell(cell, undefined, userVerificationStatus, posts)
    )
  ).then(cells => cells.filter((cell): cell is Cell => cell !== null));

  return { cells, posts, comments };
};
