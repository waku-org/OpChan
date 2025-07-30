import { Cell, Post, Comment, OpchanMessage } from '@/types';
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage } from '@/lib/waku/types';
import messageManager from '@/lib/waku';

type VerifyFunction = (message: OpchanMessage) => boolean;

export const transformCell = (
  cellMessage: CellMessage,
  verifyMessage?: VerifyFunction
): Cell | null => {
  if (verifyMessage && !verifyMessage(cellMessage)) {
    console.warn(`Cell message ${cellMessage.id} failed verification`);
    return null;
  }

  return {
    id: cellMessage.id,
    name: cellMessage.name,
    description: cellMessage.description,
    icon: cellMessage.icon || '',
    signature: cellMessage.signature,
    browserPubKey: cellMessage.browserPubKey,
  };
};

export const transformPost = (
  postMessage: PostMessage,
  verifyMessage?: VerifyFunction
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

  return {
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
};

export const transformComment = (
  commentMessage: CommentMessage,
  verifyMessage?: VerifyFunction,
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

  return {
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

export const getDataFromCache = (verifyMessage?: VerifyFunction) => {
  const cells = Object.values(messageManager.messageCache.cells)
    .map((cell) => transformCell(cell, verifyMessage))
    .filter(Boolean) as Cell[];
  const posts = Object.values(messageManager.messageCache.posts)
    .map((post) => transformPost(post, verifyMessage))
    .filter(Boolean) as Post[];
  const comments = Object.values(messageManager.messageCache.comments)
    .map((c) => transformComment(c, verifyMessage))
    .filter(Boolean) as Comment[];
  return { cells, posts, comments };
};
