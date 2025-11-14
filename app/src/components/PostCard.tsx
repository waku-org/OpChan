import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Post } from '@opchan/core';
import { RelevanceIndicator } from '@/components/ui/relevance-indicator';
import { AuthorDisplay } from '@/components/ui/author-display';
import { BookmarkButton } from '@/components/ui/bookmark-button';
import { LinkRenderer } from '@/components/ui/link-renderer';
import { useAuth, useContent, usePermissions } from '@/hooks';
import { ShareButton } from '@/components/ui/ShareButton';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const {
    bookmarks,
    pending,
    vote,
    togglePostBookmark,
    cells,
    commentsByPost,
  } = useContent();
  const permissions = usePermissions();
  const { currentUser } = useAuth();

  const cellName = cells.find(c => c.id === post.cellId)?.name || 'unknown';
  const commentCount = commentsByPost[post.id]?.length || 0;

  const isPending = pending.isPending(post.id);

  const isBookmarked = bookmarks.some(
    b => b.targetId === post.id && b.type === 'post'
  );
  const [bookmarkLoading, setBookmarkLoading] = React.useState(false);

  const score = post.upvotes.length - post.downvotes.length;
  const userUpvoted = Boolean(
    post.upvotes.some(v => v.author === currentUser?.address)
  );
  const userDownvoted = Boolean(
    post.downvotes.some(v => v.author === currentUser?.address)
  );

  const contentText =
    typeof post.content === 'string'
      ? post.content
      : String(post.content ?? '');
  const contentPreview =
    contentText.length > 200
      ? contentText.substring(0, 200) + '...'
      : contentText;

  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault();
    await vote({ targetId: post.id, isUpvote });
  };

  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBookmarkLoading(true);
    try {
      await togglePostBookmark(post, post.cellId);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div className="border-b border-border/30 py-3 px-2 hover:bg-border/5">
      <div className="flex gap-3">
        {/* Vote column - compact */}
        <div className="flex flex-col items-center gap-0.5 text-xs min-w-[40px]">
          <button
            className={`hover:text-primary ${
              userUpvoted ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={e => handleVote(e, true)}
            disabled={!permissions.canVote}
            title={permissions.canVote ? 'Upvote' : permissions.reasons.vote}
          >
            ▲
          </button>
          <span className={`font-mono text-xs ${score > 0 ? 'text-primary' : score < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {score}
          </span>
          <button
            className={`hover:text-blue-400 ${
              userDownvoted ? 'text-blue-400' : 'text-muted-foreground'
            }`}
            onClick={e => handleVote(e, false)}
            disabled={!permissions.canVote}
            title={permissions.canVote ? 'Downvote' : permissions.reasons.vote}
          >
            ▼
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-xs">
          {/* Title */}
          <Link to={`/post/${post.id}`} className="block mb-1">
            <h2 className="text-sm font-semibold text-foreground hover:underline break-words">
              {post.title}
            </h2>
          </Link>

          {/* Metadata line */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground mb-2">
            <Link
              to={cellName ? `/cell/${post.cellId}` : '#'}
              className="text-primary hover:underline"
              onClick={e => {
                if (!cellName) e.preventDefault();
              }}
            >
              r/{cellName}
            </Link>
            <span>·</span>
            <AuthorDisplay
              address={post.author}
              className="text-[11px]"
              showBadge={false}
            />
            <span>·</span>
            <span className="text-muted-foreground/80">
              {formatDistanceToNow(new Date(post.timestamp), {
                addSuffix: true,
              })}
            </span>
            {isPending && (
              <>
                <span>·</span>
                <span className="text-yellow-400 text-[10px]">syncing</span>
              </>
            )}
          </div>

          {/* Content preview */}
          {contentPreview && (
            <p className="text-muted-foreground text-xs leading-relaxed mb-2">
              <LinkRenderer text={contentPreview} />
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Link to={`/post/${post.id}`} className="hover:underline">
              {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
            </Link>
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="hover:underline"
            >
              {isBookmarked ? 'unsave' : 'save'}
            </button>
            <ShareButton
              size="sm"
              url={`${window.location.origin}/post/${post.id}`}
              title={post.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
