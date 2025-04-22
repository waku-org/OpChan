import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForum } from '@/contexts/ForumContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowUp, ArrowDown, Clock, MessageCircle, Send, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types';
import { CypherImage } from './ui/CypherImage';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { 
    posts, 
    comments, 
    getCommentsByPost, 
    createComment, 
    votePost, 
    voteComment, 
    getCellById, 
    isInitialLoading, 
    isPostingComment,
    isVoting,
    isRefreshing,
    refreshData
  } = useForum();
  const { currentUser, isAuthenticated } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  if (!postId || isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="text-cyber-accent flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Loading...
          </div>
        </div>
        
        <div className="border border-cyber-muted rounded-sm p-4 mb-8">
          <Skeleton className="h-6 w-3/4 mb-2 bg-cyber-muted" />
          <Skeleton className="h-6 w-1/2 mb-4 bg-cyber-muted" />
          <Skeleton className="h-4 w-32 bg-cyber-muted" />
        </div>
        
        <Skeleton className="h-32 w-full mb-8 bg-cyber-muted" />
        
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="ml-4 border-l-2 border-cyber-muted pl-4 py-2">
              <Skeleton className="h-4 w-full mb-2 bg-cyber-muted" />
              <Skeleton className="h-4 w-3/4 mb-2 bg-cyber-muted" />
              <Skeleton className="h-3 w-24 bg-cyber-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="text-cyber-accent hover:underline flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Cells
          </Link>
        </div>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <p className="text-cyber-neutral mb-6">The post you're looking for doesn't exist or may have been pruned.</p>
          <Button asChild>
            <Link to="/">Return to Cells</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const cell = getCellById(post.cellId);
  const postComments = getCommentsByPost(postId);
  
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      const result = await createComment(postId, newComment);
      if (result) {
        setNewComment('');
      }
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };
  
  const handleVotePost = async (isUpvote: boolean) => {
    if (!isAuthenticated) return;
    await votePost(post.id, isUpvote);
  };
  
  const handleVoteComment = async (commentId: string, isUpvote: boolean) => {
    if (!isAuthenticated) return;
    await voteComment(commentId, isUpvote);
  };
  
  const isPostUpvoted = currentUser && post.upvotes.some(vote => vote.author === currentUser.address);
  const isPostDownvoted = currentUser && post.downvotes.some(vote => vote.author === currentUser.address);
  
  const isCommentVoted = (comment: Comment, isUpvote: boolean) => {
    if (!currentUser) return false;
    const votes = isUpvote ? comment.upvotes : comment.downvotes;
    return votes.some(vote => vote.author === currentUser.address);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link 
          to={cell ? `/cell/${cell.id}` : '/'} 
          className="text-cyber-accent hover:underline flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 
          {cell ? `Back to ${cell.name}` : 'Back to Cells'}
        </Link>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={refreshData} 
          disabled={isRefreshing}
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="border border-cyber-muted rounded-sm p-4 mb-8">
        <div className="flex gap-2 items-start">
          <div className="flex flex-col items-center mr-2">
            <button 
              className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${isPostUpvoted ? 'text-cyber-accent' : ''}`}
              onClick={() => handleVotePost(true)}
              disabled={!isAuthenticated || isVoting}
              title={isAuthenticated ? "Upvote" : "Verify Ordinal to vote"}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-xs py-1">{post.upvotes.length - post.downvotes.length}</span>
            <button 
              className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${isPostDownvoted ? 'text-cyber-accent' : ''}`}
              onClick={() => handleVotePost(false)}
              disabled={!isAuthenticated || isVoting}
              title={isAuthenticated ? "Downvote" : "Verify Ordinal to vote"}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">{post.title}</h2>
            <p className="text-lg mb-4">{post.content}</p>
            <div className="flex items-center gap-4 text-xs text-cyber-neutral">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDistanceToNow(post.timestamp, { addSuffix: true })}
              </span>
              <span className="flex items-center">
                <MessageCircle className="w-3 h-3 mr-1" />
                {postComments.length} {postComments.length === 1 ? 'comment' : 'comments'}
              </span>
              <span className="truncate max-w-[150px]">
                {post.authorAddress.slice(0, 6)}...{post.authorAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {isAuthenticated ? (
        <div className="mb-8">
          <form onSubmit={handleCreateComment}>
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-cyber-muted/50 border-cyber-muted resize-none"
                disabled={isPostingComment}
              />
              <Button 
                type="submit" 
                disabled={isPostingComment || !newComment.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-8 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20 text-center">
          <p className="text-sm mb-3">Connect wallet and verify Ordinal ownership to comment</p>
          <Button asChild size="sm">
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      )}
      
      <div className="space-y-2">
        {postComments.length === 0 ? (
          <div className="text-center py-6 text-cyber-neutral">
            <p>No comments yet</p>
          </div>
        ) : (
          postComments.map(comment => (
            <div key={comment.id} className="comment-card">
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center mr-2">
                  <button 
                    className={`p-0.5 rounded-sm hover:bg-cyber-muted/50 ${isCommentVoted(comment, true) ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVoteComment(comment.id, true)}
                    disabled={!isAuthenticated || isVoting}
                    title={isAuthenticated ? "Upvote" : "Verify Ordinal to vote"}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs py-0.5">{comment.upvotes.length - comment.downvotes.length}</span>
                  <button 
                    className={`p-0.5 rounded-sm hover:bg-cyber-muted/50 ${isCommentVoted(comment, false) ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVoteComment(comment.id, false)}
                    disabled={!isAuthenticated || isVoting}
                    title={isAuthenticated ? "Downvote" : "Verify Ordinal to vote"}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm mb-2">{comment.content}</p>
                  <div className="flex items-center gap-3 text-xs text-cyber-neutral">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                    </span>
                    <span className="truncate max-w-[120px]">
                      {comment.authorAddress.slice(0, 6)}...{comment.authorAddress.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostDetail;
