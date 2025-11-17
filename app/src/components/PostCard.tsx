import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Post } from '@opchan/core';
import { useAuth, useContent, usePermissions } from '@/hooks';

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
    <div className="border-b border-border/30 py-1.5 px-2 text-xs">
      <div className="flex items-start gap-2">
        {/* Inline vote display */}
        <button
          className={`${userUpvoted ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
          onClick={e => handleVote(e, true)}
          disabled={!permissions.canVote}
          title={permissions.canVote ? 'Upvote' : permissions.reasons.vote}
        >
          ▲
        </button>
        <span className={`font-mono text-xs min-w-[2ch] text-center ${score > 0 ? 'text-primary' : score < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
          {score}
        </span>
        <button
          className={`${userDownvoted ? 'text-blue-400' : 'text-muted-foreground'} hover:text-blue-400`}
          onClick={e => handleVote(e, false)}
          disabled={!permissions.canVote}
          title={permissions.canVote ? 'Downvote' : permissions.reasons.vote}
        >
          ▼
        </button>

        {/* Content - all inline */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-1">
            <Link
              to={cellName ? `/cell/${post.cellId}` : '#'}
              className="text-primary hover:underline text-[10px]"
              onClick={e => {
                if (!cellName) e.preventDefault();
              }}
            >
              r/{cellName}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link to={`/post/${post.id}`} className="text-foreground hover:underline font-medium">
              {post.title}
            </Link>
            <span className="text-muted-foreground text-[10px]">
              by {post.author.slice(0, 6)}...{post.author.slice(-4)}
            </span>
            <span className="text-muted-foreground text-[10px]">·</span>
            <span className="text-muted-foreground text-[10px]">
              {formatDistanceToNow(new Date(post.timestamp), {
                addSuffix: true,
              })}
            </span>
            <span className="text-muted-foreground text-[10px]">·</span>
            <Link to={`/post/${post.id}`} className="text-muted-foreground hover:underline text-[10px]">
              {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
            </Link>
            <span className="text-muted-foreground text-[10px]">·</span>
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="text-muted-foreground hover:underline text-[10px]"
            >
              {isBookmarked ? 'unsave' : 'save'}
            </button>
            {isPending && (
              <>
                <span className="text-muted-foreground text-[10px]">·</span>
                <span className="text-yellow-400 text-[10px]">syncing</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
