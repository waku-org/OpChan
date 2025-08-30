import { Cell, Post, Comment } from '@/types/forum';
import {
  CellMessage,
  CommentMessage,
  PostMessage,
  VoteMessage,
} from '@/types/waku';
import messageManager from '@/lib/waku';
import { RelevanceCalculator } from './relevance';
import { UserVerificationStatus } from '@/types/forum';
import { MessageValidator } from '@/lib/utils/MessageValidator';

// Global validator instance for transformers
const messageValidator = new MessageValidator();

export const transformCell = (
  cellMessage: CellMessage,
  _verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
  userVerificationStatus?: UserVerificationStatus,
  posts?: Post[]
): Cell | null => {
  // MANDATORY: All messages must have valid signatures
  // Since CellMessage extends BaseMessage, it already has required signature fields
  // But we still need to verify the signature cryptographically
  if (!cellMessage.signature || !cellMessage.browserPubKey) {
    console.warn(
      `Cell message ${cellMessage.id} missing required signature fields`
    );
    return null;
  }

  // Verify signature using the message validator's crypto service
  const validationReport = messageValidator.getValidationReport(cellMessage);
  if (!validationReport.hasValidSignature) {
    console.warn(
      `Cell message ${cellMessage.id} failed signature validation:`,
      validationReport.errors
    );
    return null;
  }

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

export const transformPost = (
  postMessage: PostMessage,
  _verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
  userVerificationStatus?: UserVerificationStatus
): Post | null => {
  // MANDATORY: All messages must have valid signatures
  if (!postMessage.signature || !postMessage.browserPubKey) {
    console.warn(
      `Post message ${postMessage.id} missing required signature fields`
    );
    return null;
  }

  // Verify signature using the message validator's crypto service
  const validationReport = messageValidator.getValidationReport(postMessage);
  if (!validationReport.hasValidSignature) {
    console.warn(
      `Post message ${postMessage.id} failed signature validation:`,
      validationReport.errors
    );
    return null;
  }

  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === postMessage.id
  );
  // MANDATORY: Filter out votes with invalid signatures
  const filteredVotes = votes.filter(vote => {
    if (!vote.signature || !vote.browserPubKey) {
      console.warn(`Vote ${vote.id} missing signature fields`);
      return false;
    }
    const voteValidation = messageValidator.getValidationReport(vote);
    if (!voteValidation.hasValidSignature) {
      console.warn(
        `Vote ${vote.id} failed signature validation:`,
        voteValidation.errors
      );
      return false;
    }
    return true;
  });
  const upvotes = filteredVotes.filter(vote => vote.value === 1);
  const downvotes = filteredVotes.filter(vote => vote.value === -1);

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
  };

  // Calculate relevance score if user verification status is provided
  if (userVerificationStatus) {
    const relevanceCalculator = new RelevanceCalculator();

    // Get comments for this post
    const comments = Object.values(messageManager.messageCache.comments)
      .map(comment =>
        transformComment(comment, undefined, userVerificationStatus)
      )
      .filter(Boolean) as Comment[];
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

export const transformComment = (
  commentMessage: CommentMessage,
  _verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
  userVerificationStatus?: UserVerificationStatus
): Comment | null => {
  // MANDATORY: All messages must have valid signatures
  if (!commentMessage.signature || !commentMessage.browserPubKey) {
    console.warn(
      `Comment message ${commentMessage.id} missing required signature fields`
    );
    return null;
  }

  // Verify signature using the message validator's crypto service
  const validationReport = messageValidator.getValidationReport(commentMessage);
  if (!validationReport.hasValidSignature) {
    console.warn(
      `Comment message ${commentMessage.id} failed signature validation:`,
      validationReport.errors
    );
    return null;
  }
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === commentMessage.id
  );
  // MANDATORY: Filter out votes with invalid signatures
  const filteredVotes = votes.filter(vote => {
    if (!vote.signature || !vote.browserPubKey) {
      console.warn(`Vote ${vote.id} missing signature fields`);
      return false;
    }
    const voteValidation = messageValidator.getValidationReport(vote);
    if (!voteValidation.hasValidSignature) {
      console.warn(
        `Vote ${vote.id} failed signature validation:`,
        voteValidation.errors
      );
      return false;
    }
    return true;
  });
  const upvotes = filteredVotes.filter(vote => vote.value === 1);
  const downvotes = filteredVotes.filter(vote => vote.value === -1);

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
      relevanceDetails: relevanceResult.details,
    };
  }

  return transformedComment;
};

export const transformVote = (
  voteMessage: VoteMessage,
  _verifyMessage?: unknown // Deprecated parameter, kept for compatibility
): VoteMessage | null => {
  // MANDATORY: All messages must have valid signatures
  if (!voteMessage.signature || !voteMessage.browserPubKey) {
    console.warn(
      `Vote message ${voteMessage.id} missing required signature fields`
    );
    return null;
  }

  // Verify signature using the message validator's crypto service
  const validationReport = messageValidator.getValidationReport(voteMessage);
  if (!validationReport.hasValidSignature) {
    console.warn(
      `Vote message ${voteMessage.id} failed signature validation:`,
      validationReport.errors
    );
    return null;
  }

  return voteMessage;
};

export const getDataFromCache = (
  _verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
  userVerificationStatus?: UserVerificationStatus
) => {
  // First transform posts and comments to get relevance scores
  // All validation is now handled internally by the transform functions
  const posts = Object.values(messageManager.messageCache.posts)
    .map(post => transformPost(post, undefined, userVerificationStatus))
    .filter(Boolean) as Post[];

  const comments = Object.values(messageManager.messageCache.comments)
    .map(c => transformComment(c, undefined, userVerificationStatus))
    .filter(Boolean) as Comment[];

  // Then transform cells with posts for relevance calculation
  const cells = Object.values(messageManager.messageCache.cells)
    .map(cell => transformCell(cell, undefined, userVerificationStatus, posts))
    .filter(Boolean) as Cell[];

  return { cells, posts, comments };
};
