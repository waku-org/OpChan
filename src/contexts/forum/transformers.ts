import { Cell, Post, Comment } from '@/types';
import { CellMessage, CommentMessage, PostMessage } from '@/lib/waku/types';
import messageManager from '@/lib/waku';

// Helper function to transform CellMessage to Cell
export const transformCell = (cellMessage: CellMessage): Cell => {
  return {
    id: cellMessage.id,
    name: cellMessage.name,
    description: cellMessage.description,
    icon: cellMessage.icon
  };
};

// Helper function to transform PostMessage to Post with vote aggregation
export const transformPost = (postMessage: PostMessage): Post => {
  // Find all votes related to this post
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === postMessage.id
  );

  const upvotes = votes.filter(vote => vote.value === 1);
  const downvotes = votes.filter(vote => vote.value === -1);

  return {
    id: postMessage.id,
    cellId: postMessage.cellId,
    authorAddress: postMessage.author,
    title: postMessage.title,
    content: postMessage.content,
    timestamp: postMessage.timestamp,
    upvotes: upvotes,
    downvotes: downvotes
  };
};

// Helper function to transform CommentMessage to Comment with vote aggregation
export const transformComment = (commentMessage: CommentMessage): Comment => {
  // Find all votes related to this comment
  const votes = Object.values(messageManager.messageCache.votes).filter(
    vote => vote.targetId === commentMessage.id
  );
  
  const upvotes = votes.filter(vote => vote.value === 1);
  const downvotes = votes.filter(vote => vote.value === -1);

  return {
    id: commentMessage.id,
    postId: commentMessage.postId,
    authorAddress: commentMessage.author,
    content: commentMessage.content,
    timestamp: commentMessage.timestamp,
    upvotes: upvotes,
    downvotes: downvotes
  };
};

// Function to update UI state from message cache
export const getDataFromCache = () => {
  // Transform cells
  const cells = Object.values(messageManager.messageCache.cells).map(transformCell);
  
  // Transform posts
  const posts = Object.values(messageManager.messageCache.posts).map(transformPost);
  
  // Transform comments
  const comments = Object.values(messageManager.messageCache.comments).map(transformComment);
  
  return { cells, posts, comments };
}; 