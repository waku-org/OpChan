import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/contexts/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowUp, ArrowDown, Clock, MessageCircle, Send, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types';
import { CypherImage } from './ui/CypherImage';
import { Badge } from '@/components/ui/badge';
import { RelevanceIndicator } from './ui/relevance-indicator';
import { AuthorDisplay } from './ui/author-display';

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
    refreshData,
    moderateComment,
    moderateUser,
    userVerificationStatus
  } = useForum();
  const { currentUser, isAuthenticated, verificationStatus } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  if (!postId) return <div>Invalid post ID</div>;
  
  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Loading Post...</p>
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
  
  const isCellAdmin = currentUser && cell && currentUser.address === cell.signature;
  const visibleComments = isCellAdmin
    ? postComments
    : postComments.filter(comment => !comment.moderated);
  
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
  
  const handleModerateComment = async (commentId: string) => {
    const reason = window.prompt('Enter a reason for moderation (optional):') || undefined;
    if (!cell) return;
    await moderateComment(cell.id, commentId, reason, cell.signature);
  };
  
  const handleModerateUser = async (userAddress: string) => {
    if (!cell) return;
    const reason = window.prompt('Reason for moderating this user? (optional)') || undefined;
    await moderateUser(cell.id, userAddress, reason, cell.signature);
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
        
        <div className="border border-muted rounded-sm p-3 mb-6">
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center w-6 pt-1">
              <button 
                className={`p-1 rounded-sm hover:bg-secondary/50 disabled:opacity-50 ${isPostUpvoted ? 'text-primary' : ''}`}
                onClick={() => handleVotePost(true)}
                disabled={verificationStatus !== 'verified-owner' || isVoting}
                title={verificationStatus === 'verified-owner' ? "Upvote" : "Full access required to vote"}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium py-1">{post.upvotes.length - post.downvotes.length}</span>
              <button 
                className={`p-1 rounded-sm hover:bg-secondary/50 disabled:opacity-50 ${isPostDownvoted ? 'text-primary' : ''}`}
                onClick={() => handleVotePost(false)}
                disabled={verificationStatus !== 'verified-owner' || isVoting}
                title={verificationStatus === 'verified-owner' ? "Downvote" : "Full access required to vote"}
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2 text-foreground">{post.title}</h2>
              <p className="text-base mb-4 text-foreground/90">{post.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {postComments.length} {postComments.length === 1 ? 'comment' : 'comments'}
                </span>
                <AuthorDisplay 
                  address={post.authorAddress}
                  userVerificationStatus={userVerificationStatus}
                  className="truncate max-w-[150px]"
                />
                {post.relevanceScore !== undefined && (
                  <RelevanceIndicator 
                    score={post.relevanceScore} 
                    details={post.relevanceDetails}
                    type="post"
                    className="text-xs"
                    showTooltip={true}
                  />
                )}
              </div>
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
                className="flex-1 bg-secondary/40 border-muted resize-none rounded-sm text-sm p-2"
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
        <div className="mb-8 p-3 border border-muted rounded-sm bg-secondary/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Read-Only Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your wallet has been verified but does not contain any Ordinal Operators. 
            You can browse threads but cannot comment or vote.
          </p>
        </div>
      ) : (
        <div className="mb-8 p-3 border border-muted rounded-sm bg-secondary/30 text-center">
          <p className="text-sm mb-2">Connect wallet and verify Ordinal ownership to comment</p>
          <Button asChild size="sm">
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      )}
      
      <div className="space-y-2">
        {postComments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No comments yet</p>
          </div>
        ) : (
          visibleComments.map(comment => (
            <div key={comment.id} className="comment-card" id={`comment-${comment.id}`}>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center w-5 pt-0.5">
                  <button 
                    className={`p-0.5 rounded-sm hover:bg-secondary/50 disabled:opacity-50 ${isCommentVoted(comment, true) ? 'text-primary' : ''}`}
                    onClick={() => handleVoteComment(comment.id, true)}
                    disabled={verificationStatus !== 'verified-owner' || isVoting}
                    title={verificationStatus === 'verified-owner' ? "Upvote" : "Full access required to vote"}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium py-0.5">{comment.upvotes.length - comment.downvotes.length}</span>
                  <button 
                    className={`p-0.5 rounded-sm hover:bg-secondary/50 disabled:opacity-50 ${isCommentVoted(comment, false) ? 'text-primary' : ''}`}
                    onClick={() => handleVoteComment(comment.id, false)}
                    disabled={verificationStatus !== 'verified-owner' || isVoting}
                    title={verificationStatus === 'verified-owner' ? "Downvote" : "Full access required to vote"}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <CypherImage 
                        src={getIdentityImageUrl(comment.authorAddress)}
                        alt={comment.authorAddress.slice(0, 6)}
                        className="rounded-sm w-5 h-5 bg-secondary"
                      />
                      <AuthorDisplay 
                        address={comment.authorAddress}
                        userVerificationStatus={userVerificationStatus}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {comment.relevanceScore !== undefined && (
                        <RelevanceIndicator 
                          score={comment.relevanceScore} 
                          details={comment.relevanceDetails}
                          type="comment"
                          className="text-xs"
                          showTooltip={true}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm break-words">{comment.content}</p>
                  {isCellAdmin && !comment.moderated && (
                    <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleModerateComment(comment.id)}>
                      Moderate
                    </Button>
                  )}
                  {isCellAdmin && comment.authorAddress !== cell.signature && (
                    <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleModerateUser(comment.authorAddress)}>
                      Moderate User
                    </Button>
                  )}
                  {comment.moderated && (
                    <span className="ml-2 text-xs text-red-500">[Moderated]</span>
                  )}
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
