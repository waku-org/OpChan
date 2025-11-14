import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

import { AuthorDisplay } from './ui/author-display';
import { BookmarkButton } from './ui/bookmark-button';
import { MarkdownRenderer } from './ui/markdown-renderer';
import CommentCard from './CommentCard';
import { useAuth, useContent, usePermissions } from '@/hooks';
import type { Cell as ForumCell } from '@opchan/core';
import { ShareButton } from './ui/ShareButton';
import { InlineCallSignInput } from './ui/inline-callsign-input';
import { EVerificationStatus } from '@opchan/core';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  // Use aggregated forum API
  const content = useContent();
  const permissions = usePermissions();
  const { currentUser } = useAuth();
  // Get post and comments using focused hooks
  const post = content.posts.find(p => p.id === postId);
  const visibleComments = postId ? (content.commentsByPost[postId] ?? []) : [];

  // Use library pending API
  const postPending = content.pending.isPending(post?.id);
  const postVotePending = content.pending.isPending(post?.id);

  // Check if bookmarked
  const isBookmarked = content.bookmarks.some(
    b => b.targetId === post?.id && b.type === 'post'
  );
  const [bookmarkLoading, setBookmarkLoading] = React.useState(false);

  const [newComment, setNewComment] = useState('');

  if (!postId) return <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 text-center">Invalid post ID</div>;

  // ✅ Loading state handled by hook
  if (postPending) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-12 sm:py-16 text-center">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4 animate-spin text-primary" />
        <p className="text-sm sm:text-lg font-medium text-muted-foreground">
          Loading Post...
        </p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 text-center">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 uppercase tracking-[0.2em]">Post not found</h2>
        <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-muted-foreground px-4">
          The post you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild size="sm" className="text-[10px] sm:text-[11px] px-3 sm:px-4">
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    );
  }

  // ✅ All data comes pre-computed from hooks
  const cell = content.cells.find((c: ForumCell) => c.id === post?.cellId);

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

  const score = post.upvotes.length - post.downvotes.length;
  const isPostUpvoted = Boolean(
    post.upvotes.some(v => v.author === currentUser?.address)
  );
  const isPostDownvoted = Boolean(
    post.downvotes.some(v => v.author === currentUser?.address)
  );

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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
      <div className="mb-4 sm:mb-6">
        <Button
          onClick={() => navigate(`/cell/${post.cellId}`)}
          variant="ghost"
          size="sm"
          className="mb-3 sm:mb-4 text-[10px] sm:text-[11px] px-2 sm:px-3"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="hidden sm:inline">Back to /{cell?.name || 'cell'}/</span>
          <span className="sm:hidden">BACK</span>
        </Button>

        <div className="border border-border rounded-none p-2 sm:p-3 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
            <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-2 sm:gap-1 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-border/60 pb-3 sm:pb-0 sm:pr-3">
              <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1">
                <button
                  className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                    isPostUpvoted
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => handleVotePost(true)}
                  disabled={!permissions.canVote}
                  title={
                    permissions.canVote ? 'Upvote post' : permissions.reasons.vote
                  }
                >
                  <ArrowUp className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>
                <span className="text-sm font-semibold text-foreground min-w-[24px] text-center">{score}</span>
                <button
                  className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                    isPostDownvoted
                      ? 'text-blue-400'
                      : 'text-muted-foreground hover:text-blue-400'
                  }`}
                  onClick={() => handleVotePost(false)}
                  disabled={!permissions.canVote}
                  title={
                    permissions.canVote
                      ? 'Downvote post'
                      : permissions.reasons.vote
                  }
                >
                  <ArrowDown className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>
              </div>
              {postVotePending && (
                <span className="text-[9px] sm:text-[10px] text-yellow-400 sm:mt-0.5 whitespace-nowrap">
                  syncing…
                </span>
              )}
              <div className="flex flex-row sm:flex-col items-center gap-1 sm:gap-1 mt-0 sm:mt-1">
                <BookmarkButton
                  isBookmarked={isBookmarked}
                  loading={bookmarkLoading}
                  onClick={handleBookmark}
                  size="sm"
                  variant="ghost"
                  showText={false}
                />
                <ShareButton
                  size="sm"
                  url={`${window.location.origin}/post/${post.id}`}
                  title={post.title}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">
                <Link
                  to={cell?.id ? `/cell/${cell.id}` : "#"}
                  className="font-medium text-primary hover:underline focus:underline truncate"
                  tabIndex={0}
                  onClick={e => {
                    if (!cell?.id) e.preventDefault();
                  }}
                  title={cell?.name ? `Go to /${cell.name}` : undefined}
                >
                  r/{cell?.name || 'unknown'}
                </Link>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Posted by u/</span>
                <span className="sm:hidden">u/</span>
                <AuthorDisplay
                  address={post.author}
                  className="text-[10px] sm:text-xs truncate"
                  showBadge={false}
                />
                <span className="hidden sm:inline">•</span>
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="normal-case tracking-normal text-foreground text-[10px] sm:text-xs">
                  {formatDistanceToNow(new Date(post.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {/* Relevance details unavailable in raw PostMessage; skip indicator */}
                {postPending && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="px-1.5 sm:px-2 py-0.5 border border-yellow-500 text-yellow-400 text-[9px] sm:text-[10px]">
                      syncing…
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words text-foreground mb-2 sm:mb-3">{post.title}</h1>
              <div className="text-xs sm:text-sm break-words prose prose-invert max-w-none">
                <MarkdownRenderer content={post.content} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {permissions.canComment && (
        <div className="mb-6 sm:mb-8">
          <form onSubmit={handleCreateComment} onKeyDown={handleKeyDown}>
            <h2 className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-1 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Add a comment</span>
            </h2>
            <MarkdownInput
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={setNewComment}
              disabled={false}
              minHeight={100}
              initialHeight={120}
              maxHeight={600}
            />
            <div className="mt-2 sm:mt-3 flex justify-end">
              <Button
                type="submit"
                disabled={!permissions.canComment}
                className="text-primary border-primary hover:bg-primary/10 text-[10px] sm:text-[11px] px-3 sm:px-4"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Post Comment</span>
                <span className="sm:hidden">POST</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Call Sign Suggestion for Anonymous Users */}
      {currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS && !currentUser.callSign && permissions.canComment && (
        <div className="mb-6">
          <InlineCallSignInput />
        </div>
      )}

      {!permissions.canComment && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-border rounded-none bg-transparent text-center">
          <p className="text-xs sm:text-sm mb-2 sm:mb-3 text-muted-foreground">Connect your wallet to comment</p>
          <Button asChild size="sm" className="text-[10px] sm:text-[11px] px-3 sm:px-4">
            <Link to="/">Connect Wallet</Link>
          </Button>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 uppercase tracking-[0.2em] sm:tracking-[0.25em]">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span>Comments ({visibleComments.length})</span>
        </h2>

        {visibleComments.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-base sm:text-lg font-bold mb-2 uppercase tracking-[0.2em] sm:tracking-[0.25em]">No comments yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
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
