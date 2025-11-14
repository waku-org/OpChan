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
    <div className="thread-card mb-2">
      <div className="flex flex-col sm:flex-row">
        {/* Voting column */}
        <div className="flex sm:flex-col flex-row items-center justify-between sm:justify-start gap-2 sm:gap-2 p-2 sm:p-2 border-b sm:border-b-0 sm:border-r border-border/60 bg-transparent sm:w-auto w-full">
          <div className="flex sm:flex-col items-center gap-2">
            <button
              className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                userUpvoted
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              onClick={e => handleVote(e, true)}
              disabled={!permissions.canVote}
              title={permissions.canVote ? 'Upvote' : permissions.reasons.vote}
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <span className="text-sm font-semibold text-foreground min-w-[24px] text-center">
              {score}
            </span>

            <button
              className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                userDownvoted
                  ? 'text-blue-400'
                  : 'text-muted-foreground hover:text-blue-400'
              }`}
              onClick={e => handleVote(e, false)}
              disabled={!permissions.canVote}
              title={permissions.canVote ? 'Downvote' : permissions.reasons.vote}
            >
              <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          {isPending && (
            <span className="text-[9px] sm:text-[10px] text-yellow-400 sm:mt-1">syncing…</span>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 p-2 sm:p-3 min-w-0">
          <div className="space-y-3">
            {/* Post metadata */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.12em] text-muted-foreground">
              <Link
                to={cellName ? `/cell/${post.cellId}` : '#'}
                className="text-primary hover:underline truncate"
                tabIndex={0}
                onClick={e => {
                  if (!cellName) e.preventDefault();
                }}
                title={cellName ? `Go to /${cellName}` : undefined}
              >
                r/{cellName || 'unknown'}
              </Link>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Posted by u/</span>
              <span className="sm:hidden">u/</span>
              <AuthorDisplay
                address={post.author}
                className="text-[10px] sm:text-xs truncate"
                showBadge={false}
              />
              <span className="opacity-50 hidden sm:inline">/</span>
              <span className="normal-case tracking-normal text-foreground text-[10px] sm:text-[11px]">
                {formatDistanceToNow(new Date(post.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {'relevanceScore' in post &&
                typeof (post as Post).relevanceScore === 'number' && (
                  <>
                    <span className="opacity-50 hidden sm:inline">/</span>
                    <RelevanceIndicator
                      score={(post as Post).relevanceScore as number}
                      details={
                        'relevanceDetails' in post
                          ? (post as Post).relevanceDetails
                          : undefined
                      }
                      type="post"
                      className="text-[10px] sm:text-[11px]"
                      showTooltip={true}
                    />
                  </>
                )}
            </div>

            {/* Post title and content - clickable to navigate to post */}
            <div className="block">
              <Link to={`/post/${post.id}`} className="block">
                <h2 className="text-sm sm:text-base font-semibold text-foreground break-words">
                  {post.title}
                </h2>
              </Link>

              {/* Post content preview */}
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-1 sm:mt-2 break-words">
                <LinkRenderer text={contentPreview} />
              </p>
            </div>

            {/* Post actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-muted-foreground mt-2 sm:mt-3">
              <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                <div className="flex items-center space-x-1 hover:text-foreground">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{commentCount} comments</span>
                </div>
                {isPending && (
                  <span className="px-1.5 sm:px-2 py-0.5 border border-yellow-500 text-yellow-400 text-[9px] sm:text-[10px]">
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
