import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForum } from '@/contexts/ForumContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowUp, ArrowDown, Clock, MessageCircle, Send, RefreshCw, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types';
import { CypherImage } from './ui/CypherImage';
import { Badge } from '@/components/ui/badge';

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
  const { currentUser, isAuthenticated, verificationStatus } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  if (!postId) return <div>Invalid post ID</div>;
  
  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-3" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold mb-4">Post not found</h2>
        <p className="mb-4">The post you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    );
  }
  
  const cell = getCellById(post.cellId);
  const postComments = getCommentsByPost(post.id);
  
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
    if (verificationStatus !== 'verified-owner') return;
    await votePost(post.id, isUpvote);
  };
  
  const handleVoteComment = async (commentId: string, isUpvote: boolean) => {
    if (verificationStatus !== 'verified-owner') return;
    await voteComment(commentId, isUpvote);
  };
  
  const isPostUpvoted = currentUser && post.upvotes.some(vote => vote.author === currentUser.address);
  const isPostDownvoted = currentUser && post.downvotes.some(vote => vote.author === currentUser.address);
  
  const isCommentVoted = (comment: Comment, isUpvote: boolean) => {
    if (!currentUser) return false;
    const votes = isUpvote ? comment.upvotes : comment.downvotes;
    return votes.some(vote => vote.author === currentUser.address);
  };
  
  const getIdentityImageUrl = (address: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button 
          onClick={() => navigate(`/cell/${post.cellId}`)} 
          variant="ghost" 
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to /{cell?.name || 'cell'}/
        </Button>
        
        <div className="flex gap-4 items-start">
          <div className="flex flex-col items-center">
            <button 
              className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${isPostUpvoted ? 'text-cyber-accent' : ''}`}
              onClick={() => handleVotePost(true)}
              disabled={verificationStatus !== 'verified-owner' || isVoting}
              title={verificationStatus === 'verified-owner' ? "Upvote" : "Full access required to vote"}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-sm py-1">{post.upvotes.length - post.downvotes.length}</span>
            <button 
              className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${isPostDownvoted ? 'text-cyber-accent' : ''}`}
              onClick={() => handleVotePost(false)}
              disabled={verificationStatus !== 'verified-owner' || isVoting}
              title={verificationStatus === 'verified-owner' ? "Downvote" : "Full access required to vote"}
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
      
      {verificationStatus === 'verified-owner' ? (
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
      ) : verificationStatus === 'verified-none' ? (
        <div className="mb-8 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-cyber-neutral" />
            <h3 className="font-medium">Read-Only Mode</h3>
          </div>
          <p className="text-sm text-cyber-neutral">
            Your wallet has been verified but does not contain any Ordinal Operators. 
            You can browse threads but cannot comment or vote.
          </p>
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
                    disabled={verificationStatus !== 'verified-owner' || isVoting}
                    title={verificationStatus === 'verified-owner' ? "Upvote" : "Full access required to vote"}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs py-0.5">{comment.upvotes.length - comment.downvotes.length}</span>
                  <button 
                    className={`p-0.5 rounded-sm hover:bg-cyber-muted/50 ${isCommentVoted(comment, false) ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVoteComment(comment.id, false)}
                    disabled={verificationStatus !== 'verified-owner' || isVoting}
                    title={verificationStatus === 'verified-owner' ? "Downvote" : "Full access required to vote"}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-cyber-muted/30 rounded-sm p-3 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <CypherImage 
                        src={getIdentityImageUrl(comment.authorAddress)}
                        alt={comment.authorAddress.slice(0, 6)}
                        className="rounded-sm w-5 h-5 bg-cyber-muted"
                      />
                      <span className="text-xs text-cyber-neutral">
                        {comment.authorAddress.slice(0, 6)}...{comment.authorAddress.slice(-4)}
                      </span>
                    </div>
                    <span className="text-xs text-cyber-neutral">
                      {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm break-words">{comment.content}</p>
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
