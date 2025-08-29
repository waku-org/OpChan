import { Cell, Post, Comment, OpchanMessage } from '@/types/forum';
import { CellMessage, CommentMessage, PostMessage, VoteMessage } from '@/types/waku';
import messageManager from '@/lib/waku';
import { RelevanceCalculator } from './relevance';
import { UserVerificationStatus } from '@/types/forum';

type VerifyFunction = (message: OpchanMessage) => boolean;

export const transformCell = (
  cellMessage: CellMessage,
  verifyMessage?: VerifyFunction,
  userVerificationStatus?: UserVerificationStatus,
  posts?: Post[]
): Cell | null => {
  if (verifyMessage && !verifyMessage(cellMessage)) {
    console.warn(`Cell message ${cellMessage.id} failed verification`);
    return null;
  }

  const transformedCell = {
    id: cellMessage.id,
    name: cellMessage.name,
    description: cellMessage.description,
    icon: cellMessage.icon || '',
    signature: cellMessage.signature,
    browserPubKey: cellMessage.browserPubKey,
  };

  // Calculate relevance score if user verification status and posts are provided
  if (userVerificationStatus && posts) {
    const relevanceCalculator = new RelevanceCalculator();
    
    const relevanceResult = relevanceCalculator.calculateCellScore(
      transformedCell,
      posts,
      userVerificationStatus
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
      relevanceDetails: relevanceResult.details
    };
  }

  return transformedCell;
};

export const transformPost = (
  postMessage: PostMessage,
  verifyMessage?: VerifyFunction,
  userVerificationStatus?: UserVerificationStatus
): Post | null => {
  if (verifyMessage && !verifyMessage(postMessage)) {
    console.warn(`Post message ${postMessage.id} failed verification`);
    return null;
  }

  const votes = Object.values(messageManager.messageCache.votes).filter(
    (vote) => vote.targetId === postMessage.id,
  );
  const filteredVotes = verifyMessage
    ? votes.filter((vote) => verifyMessage(vote))
    : votes;
  const upvotes = filteredVotes.filter((vote) => vote.value === 1);
  const downvotes = filteredVotes.filter((vote) => vote.value === -1);

  const modMsg = messageManager.messageCache.moderations[postMessage.id];
  const isPostModerated = !!modMsg && modMsg.targetType === 'post';
  const userModMsg = Object.values(messageManager.messageCache.moderations).find(
    (m) => m.targetType === 'user' && m.cellId === postMessage.cellId && m.targetId === postMessage.author,
  );
  const isUserModerated = !!userModMsg;

  const transformedPost = {
    id: postMessage.id,
    cellId: postMessage.cellId,
    authorAddress: postMessage.author,
    title: postMessage.title,
    content: postMessage.content,
    timestamp: postMessage.timestamp,
    upvotes,
    downvotes,
    signature: postMessage.signature,
    browserPubKey: postMessage.browserPubKey,
    moderated: isPostModerated || isUserModerated,
    moderatedBy: isPostModerated ? modMsg.author : isUserModerated ? userModMsg!.author : undefined,
    moderationReason: isPostModerated ? modMsg.reason : isUserModerated ? userModMsg!.reason : undefined,
    moderationTimestamp: isPostModerated ? modMsg.timestamp : isUserModerated ? userModMsg!.timestamp : undefined,
  };

  // Calculate relevance score if user verification status is provided
  if (userVerificationStatus) {
    const relevanceCalculator = new RelevanceCalculator();
    
    // Get comments for this post
    const comments = Object.values(messageManager.messageCache.comments)
      .map((comment) => transformComment(comment, verifyMessage, userVerificationStatus))
      .filter(Boolean) as Comment[];
    const postComments = comments.filter(comment => comment.postId === postMessage.id);
    
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
      relevanceDetails: relevanceResult.details
    };
  }

  return transformedPost;
};

export const transformComment = (
  commentMessage: CommentMessage,
  verifyMessage?: VerifyFunction,
  userVerificationStatus?: UserVerificationStatus
): Comment | null => {
  if (verifyMessage && !verifyMessage(commentMessage)) {
    console.warn(`Comment message ${commentMessage.id} failed verification`);
    return null;
  }
  const votes = Object.values(messageManager.messageCache.votes).filter(
    (vote) => vote.targetId === commentMessage.id,
  );
  const filteredVotes = verifyMessage
    ? votes.filter((vote) => verifyMessage(vote))
    : votes;
  const upvotes = filteredVotes.filter((vote) => vote.value === 1);
  const downvotes = filteredVotes.filter((vote) => vote.value === -1);

  const modMsg = messageManager.messageCache.moderations[commentMessage.id];
  const isCommentModerated = !!modMsg && modMsg.targetType === 'comment';
  const userModMsg = Object.values(messageManager.messageCache.moderations).find(
    (m) =>
      m.targetType === 'user' &&
      m.cellId === commentMessage.postId.split('-')[0] &&
      m.targetId === commentMessage.author,
  );
  const isUserModerated = !!userModMsg;

  const transformedComment = {
    id: commentMessage.id,
    postId: commentMessage.postId,
    authorAddress: commentMessage.author,
    content: commentMessage.content,
    timestamp: commentMessage.timestamp,
    upvotes,
    downvotes,
    signature: commentMessage.signature,
    browserPubKey: commentMessage.browserPubKey,
    moderated: isCommentModerated || isUserModerated,
    moderatedBy: isCommentModerated ? modMsg.author : isUserModerated ? userModMsg!.author : undefined,
    moderationReason: isCommentModerated ? modMsg.reason : isUserModerated ? userModMsg!.reason : undefined,
    moderationTimestamp: isCommentModerated ? modMsg.timestamp : isUserModerated ? userModMsg!.timestamp : undefined,
  };

  // Calculate relevance score if user verification status is provided
  if (userVerificationStatus) {
    const relevanceCalculator = new RelevanceCalculator();
    
    const relevanceResult = relevanceCalculator.calculateCommentScore(
      transformedComment,
      filteredVotes,
      userVerificationStatus
    );

    return {
      ...transformedComment,
      relevanceScore: relevanceResult.score,
      relevanceDetails: relevanceResult.details
    };
  }

  return transformedComment;
};

export const transformVote = (
  voteMessage: VoteMessage,
  verifyMessage?: VerifyFunction,
): VoteMessage | null => {
  if (verifyMessage && !verifyMessage(voteMessage)) {
    console.warn(`Vote message ${voteMessage.id} failed verification`);
    return null;
  }
  return voteMessage;
};

export const getDataFromCache = (
  verifyMessage?: VerifyFunction,
  userVerificationStatus?: UserVerificationStatus
) => {
  // First transform posts and comments to get relevance scores
  const posts = Object.values(messageManager.messageCache.posts)
    .map((post) => transformPost(post, verifyMessage, userVerificationStatus))
    .filter(Boolean) as Post[];
  
  const comments = Object.values(messageManager.messageCache.comments)
    .map((c) => transformComment(c, verifyMessage, userVerificationStatus))
    .filter(Boolean) as Comment[];
  
  // Then transform cells with posts for relevance calculation
  const cells = Object.values(messageManager.messageCache.cells)
    .map((cell) => transformCell(cell, verifyMessage, userVerificationStatus, posts))
    .filter(Boolean) as Cell[];
  
  return { cells, posts, comments };
};
