import { Cell, Post, Comment, OpchanMessage } from '@/types';
import { CellMessage, CommentMessage, MessageType, PostMessage, VoteMessage } from '@/lib/waku/types';
import messageManager from '@/lib/waku';

// Type for the verification function
type VerifyFunction = (message: OpchanMessage) => boolean;

// Helper function to transform CellMessage to Cell
export const transformCell = (
  cellMessage: CellMessage, 
  verifyMessage?: VerifyFunction
): Cell | null => {
  // Verify the message if a verification function is provided
  if (verifyMessage && !verifyMessage(cellMessage)) {
    console.warn(`Cell message ${cellMessage.id} failed verification`);
    return null;
  }

  return {
    id: cellMessage.id,
    name: cellMessage.name,
    description: cellMessage.description,
    icon: cellMessage.icon,
    // Include signature information for future verification if needed
    signature: cellMessage.signature,
    browserPubKey: cellMessage.browserPubKey
  };
};

// Helper function to transform PostMessage to Post with vote aggregation
export const transformPost = (
  postMessage: PostMessage,
  verifyMessage?: VerifyFunction
): Post | null => {
  // Verify the message if a verification function is provided
  if (verifyMessage && !verifyMessage(postMessage)) {
    console.warn(`Post message ${postMessage.id} failed verification`);
    return null;
  }

  // Find all votes related to this post
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === postMessage.id
  );

  // Only include verified votes if verification function is provided
  const filteredVotes = verifyMessage 
    ? votes.filter(vote => verifyMessage(vote))
    : votes;

  const upvotes = filteredVotes.filter(vote => vote.value === 1);
  const downvotes = filteredVotes.filter(vote => vote.value === -1);

  return {
    id: postMessage.id,
    cellId: postMessage.cellId,
    authorAddress: postMessage.author,
    title: postMessage.title,
    content: postMessage.content,
    timestamp: postMessage.timestamp,
    upvotes: upvotes,
    downvotes: downvotes,
    // Include signature information for future verification if needed
    signature: postMessage.signature,
    browserPubKey: postMessage.browserPubKey
  };
};

// Helper function to transform CommentMessage to Comment with vote aggregation
export const transformComment = (
  commentMessage: CommentMessage,
  verifyMessage?: VerifyFunction
): Comment | null => {
  // Verify the message if a verification function is provided
  if (verifyMessage && !verifyMessage(commentMessage)) {
    console.warn(`Comment message ${commentMessage.id} failed verification`);
    return null;
  }
  
  // Find all votes related to this comment
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === commentMessage.id
  );
  
  // Only include verified votes if verification function is provided
  const filteredVotes = verifyMessage 
    ? votes.filter(vote => verifyMessage(vote))
    : votes;
  
  const upvotes = filteredVotes.filter(vote => vote.value === 1);
  const downvotes = filteredVotes.filter(vote => vote.value === -1);

  return {
    id: commentMessage.id,
    postId: commentMessage.postId,
    authorAddress: commentMessage.author,
    content: commentMessage.content,
    timestamp: commentMessage.timestamp,
    upvotes: upvotes,
    downvotes: downvotes,
    // Include signature information for future verification if needed
    signature: commentMessage.signature,
    browserPubKey: commentMessage.browserPubKey
  };
};

// Helper function to transform VoteMessage (new)
export const transformVote = (
  voteMessage: VoteMessage,
  verifyMessage?: VerifyFunction
): VoteMessage | null => {
  // Verify the message if a verification function is provided
  if (verifyMessage && !verifyMessage(voteMessage)) {
    console.warn(`Vote message ${voteMessage.id} failed verification`);
    return null;
  }
  
  return voteMessage;
};

// Function to update UI state from message cache with verification
export const getDataFromCache = (verifyMessage?: VerifyFunction) => {
  // Transform cells with verification
  const cells = Object.values(messageManager.messageCache.cells)
    .map(cell => transformCell(cell, verifyMessage))
    .filter(cell => cell !== null) as Cell[];
  
  // Transform posts with verification
  const posts = Object.values(messageManager.messageCache.posts)
    .map(post => transformPost(post, verifyMessage))
    .filter(post => post !== null) as Post[];
  
  // Transform comments with verification
  const comments = Object.values(messageManager.messageCache.comments)
    .map(comment => transformComment(comment, verifyMessage))
    .filter(comment => comment !== null) as Comment[];
  
  return { cells, posts, comments };
}; 