import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Post, PostMessage } from '@opchan/core';
import { RelevanceIndicator } from '@/components/ui/relevance-indicator';
import { AuthorDisplay } from '@/components/ui/author-display';
import { BookmarkButton } from '@/components/ui/bookmark-button';
import { LinkRenderer } from '@/components/ui/link-renderer';
import { useContent, usePermissions } from '@/hooks';
import { ShareButton } from '@/components/ui/ShareButton';

interface PostCardProps {
  post: Post | PostMessage;
  commentCount?: number;
}

const PostCard: React.FC<PostCardProps> = ({ post, commentCount = 0 }) => {
  const content = useContent();
  const permissions = usePermissions();

  // Get cell data from content
  const cell = content.cells.find((c) => c.id === post.cellId);
  const cellName = cell?.name || 'unknown';

  // Use pre-computed vote data or safely compute from arrays when available
  const computedVoteScore =
    'voteScore' in post && typeof (post as Post).voteScore === 'number'
      ? (post as Post).voteScore
      : undefined;
  const upvoteCount =
    'upvotes' in post && Array.isArray((post as Post).upvotes)
      ? (post as Post).upvotes.length
      : 0;
  const downvoteCount =
    'downvotes' in post && Array.isArray((post as Post).downvotes)
      ? (post as Post).downvotes.length
      : 0;
  const score = computedVoteScore ?? upvoteCount - downvoteCount;

  // Use library pending API
  const isPending = content.pending.isPending(post.id);

  // Get user vote status from post data
  const userUpvoted =
    (post as unknown as { userUpvoted?: boolean }).userUpvoted || false;
  const userDownvoted =
    (post as unknown as { userDownvoted?: boolean }).userDownvoted || false;

  // Check if bookmarked
  const isBookmarked = content.bookmarks.some((b) => b.targetId === post.id && b.type === 'post');
  const [bookmarkLoading, setBookmarkLoading] = React.useState(false);

  // Remove duplicate vote status logic

  // ✅ Content truncation (simple presentation logic is OK)
  const contentText = typeof post.content === 'string' ? post.content : String(post.content ?? '');
  const contentPreview =
    contentText.length > 200
      ? contentText.substring(0, 200) + '...'
      : contentText;

  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault();
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

  return (
    <div className="thread-card mb-2">
      <div className="flex">
        {/* Voting column */}
        <div className="flex flex-col items-center p-2 bg-cyber-muted/50 border-r border-cyber-muted">
          <button
            className={`p-1 rounded hover:bg-cyber-muted transition-colors ${
              userUpvoted
                ? 'text-cyber-accent'
                : 'text-cyber-neutral hover:text-cyber-accent'
            }`}
            onClick={e => handleVote(e, true)}
            disabled={!permissions.canVote}
            title={permissions.canVote ? 'Upvote' : permissions.reasons.vote}
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          <span
            className={`text-sm font-medium px-1 ${
              score > 0
                ? 'text-cyber-accent'
                : score < 0
                  ? 'text-blue-400'
                  : 'text-cyber-neutral'
            }`}
          >
            {score}
          </span>

          <button
            className={`p-1 rounded hover:bg-cyber-muted transition-colors ${
              userDownvoted
                ? 'text-blue-400'
                : 'text-cyber-neutral hover:text-blue-400'
            }`}
            onClick={e => handleVote(e, false)}
            disabled={!permissions.canVote}
            title={permissions.canVote ? 'Downvote' : permissions.reasons.vote}
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          {isPending && (
            <span className="mt-1 text-[10px] text-yellow-400">syncing…</span>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 p-3">
          <div className="block hover:opacity-80">
            {/* Post metadata */}
            <div className="flex items-center text-xs text-cyber-neutral mb-2 space-x-2">
              <span className="font-medium text-cyber-accent">
                r/{cellName}
              </span>
              <span>•</span>
              <span>Posted by u/</span>
              <AuthorDisplay
                address={post.author}
                className="text-xs"
                showBadge={false}
              />
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(post.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {('relevanceScore' in post) && typeof (post as Post).relevanceScore === 'number' && (
                <>
                  <span>•</span>
                  <RelevanceIndicator
                    score={(post as Post).relevanceScore as number}
                    details={('relevanceDetails' in post ? (post as Post).relevanceDetails : undefined)}
                    type="post"
                    className="text-xs"
                    showTooltip={true}
                  />
                </>
              )}
            </div>

            {/* Post title and content - clickable to navigate to post */}
            <div className="block">
              <Link to={`/post/${post.id}`} className="block">
                <h2 className="text-lg font-semibold text-glow mb-2 hover:text-cyber-accent transition-colors">
                  {post.title}
                </h2>
              </Link>

              {/* Post content preview */}
              <p className="text-cyber-neutral text-sm leading-relaxed mb-3">
                <LinkRenderer text={contentPreview} />
              </p>
            </div>

            {/* Post actions */}
            <div className="flex items-center justify-between text-xs text-cyber-neutral">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 hover:text-cyber-accent transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span>{commentCount} comments</span>
                </div>
                {isPending && (
                  <span className="px-2 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    syncing…
                  </span>
                )}
                <ShareButton
                  size="sm"
                  url={`${window.location.origin}/post/${post.id}`}
                  title={post.title}
                />
              </div>
              <BookmarkButton
                isBookmarked={isBookmarked}
                loading={bookmarkLoading}
                onClick={handleBookmark}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
