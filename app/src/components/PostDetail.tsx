import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePost, usePostComments } from '@/hooks';
import { Button } from '@/components/ui/button';
//
// import ResizableTextarea from '@/components/ui/resizable-textarea';
import { MarkdownInput } from '@/components/ui/markdown-input';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  MessageCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { RelevanceIndicator } from './ui/relevance-indicator';
import { AuthorDisplay } from './ui/author-display';
import { BookmarkButton } from './ui/bookmark-button';
import { MarkdownRenderer } from './ui/markdown-renderer';
import CommentCard from './CommentCard';
import { useForum } from '@opchan/react';
import { ShareButton } from './ui/ShareButton';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  // Use aggregated forum API
  const forum = useForum();
  const { content, permissions } = forum;

  // Get post and comments using focused hooks
  const post = usePost(postId);
  const comments = usePostComments(postId);

  // Use library pending API
  const postPending = content.pending.isPending(post?.id);
  const postVotePending = content.pending.isVotePending(post?.id);

  // Check if bookmarked
  const isBookmarked = content.bookmarks.some(
    b => b.targetId === post?.id && b.type === 'post'
  );
  const [bookmarkLoading, setBookmarkLoading] = React.useState(false);

  const [newComment, setNewComment] = useState('');

  if (!postId) return <div>Invalid post ID</div>;

  // ✅ Loading state handled by hook
  if (comments.isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">
          Loading Post...
        </p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold mb-4">Post not found</h2>
        <p className="mb-4">
          The post you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    );
  }

  // ✅ All data comes pre-computed from hooks
  const { cell } = post;
  const visibleComments = comments.comments; // Already filtered by hook

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Use aggregated content API
    const result = await content.createComment({ postId, content: newComment });
    if (result) {
      setNewComment('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter inserts newline by default. Send on Ctrl+Enter or Shift+Enter.
    const isSendCombo =
      (e.ctrlKey || e.metaKey || e.shiftKey) && e.key === 'Enter';
    if (isSendCombo) {
      e.preventDefault();
      if (newComment.trim()) {
        handleCreateComment(e as React.FormEvent);
      }
    }
  };

  const handleVotePost = async (isUpvote: boolean) => {
    await content.vote({ targetId: post.id, isUpvote });
  };

  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBookmarkLoading(true);
    try {
      await content.togglePostBookmark(post, post.cellId);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Get vote status from post data
  const isPostUpvoted =
    (post as unknown as { userUpvoted?: boolean }).userUpvoted || false;
  const isPostDownvoted =
    (post as unknown as { userDownvoted?: boolean }).userDownvoted || false;

  const handleModerateComment = async (commentId: string) => {
    const reason =
      window.prompt('Enter a reason for moderation (optional):') || undefined;
    if (!cell) return;
    await content.moderate.comment(cell.id, commentId, reason);
  };

  const handleUnmoderateComment = async (commentId: string) => {
    const reason =
      window.prompt('Optional note for unmoderation?') || undefined;
    if (!cell) return;
    await content.moderate.uncomment(cell.id, commentId, reason);
  };

  const handleModerateUser = async (userAddress: string) => {
    const reason =
      window.prompt('Reason for moderating this user? (optional)') || undefined;
    if (!cell) return;
    await content.moderate.user(cell.id, userAddress, reason);
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
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <button
                className={`p-1 rounded-sm hover:bg-muted/50 ${
                  isPostUpvoted ? 'text-primary' : ''
                }`}
                onClick={() => handleVotePost(true)}
                disabled={!permissions.canVote}
                title={
                  permissions.canVote ? 'Upvote post' : permissions.reasons.vote
                }
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold">{post.voteScore}</span>
              <button
                className={`p-1 rounded-sm hover:bg-muted/50 ${
                  isPostDownvoted ? 'text-primary' : ''
                }`}
                onClick={() => handleVotePost(false)}
                disabled={!permissions.canVote}
                title={
                  permissions.canVote
                    ? 'Downvote post'
                    : permissions.reasons.vote
                }
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              {postVotePending && (
                <span className="mt-1 text-[10px] text-yellow-500">
                  syncing…
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium text-primary">
                  r/{cell?.name || 'unknown'}
                </span>
                <span>•</span>
                <span>Posted by u/</span>
                <AuthorDisplay
                  address={post.author}
                  className="text-sm"
                  showBadge={false}
                />
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(post.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {post.relevanceScore !== undefined && (
                  <>
                    <span>•</span>
                    <RelevanceIndicator
                      score={post.relevanceScore}
                      details={post.relevanceDetails}
                      type="post"
                      className="text-sm"
                      showTooltip={true}
                    />
                  </>
                )}
                {postPending && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      syncing…
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-start justify-between mb-3">
                <h1 className="text-2xl font-bold flex-1">{post.title}</h1>
                <BookmarkButton
                  isBookmarked={isBookmarked}
                  loading={bookmarkLoading}
                  onClick={handleBookmark}
                  size="lg"
                  variant="ghost"
                  showText={true}
                />
                <ShareButton
                  size="lg"
                  url={`${window.location.origin}/post/${post.id}`}
                  title={post.title}
                />
              </div>
              <div className="text-sm break-words prose prose-invert max-w-none">
                <MarkdownRenderer content={post.content} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {permissions.canComment && (
        <div className="mb-8">
          <form onSubmit={handleCreateComment} onKeyDown={handleKeyDown}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              Add a comment
            </h2>
            <MarkdownInput
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={setNewComment}
              disabled={false}
              minHeight={100}
              initialHeight={140}
              maxHeight={600}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!permissions.canComment}
                className="bg-cyber-accent hover:bg-cyber-accent/80"
              >
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </form>
        </div>
      )}

      {!permissions.canComment && (
        <div className="mb-6 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20 text-center">
          <p className="text-sm mb-3">
            Connect your wallet to comment
          </p>
          <Button asChild size="sm">
            <Link to="/">Connect Wallet</Link>
          </Button>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({visibleComments.length})
        </h2>

        {visibleComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-bold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">
              {permissions.canComment
                ? 'Be the first to share your thoughts!'
                : 'Connect your wallet to join the conversation.'}
            </p>
          </div>
        ) : (
          visibleComments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              postId={postId}
              cellId={cell?.id}
              canModerate={permissions.canModerate(cell?.id || '')}
              onModerateComment={handleModerateComment}
              onUnmoderateComment={handleUnmoderateComment}
              onModerateUser={handleModerateUser}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PostDetail;
