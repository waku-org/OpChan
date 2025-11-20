import React from 'react';
import { ArrowUp, ArrowDown, Clock, MessageSquareX, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@opchan/core';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/ui/bookmark-button';
import { AuthorDisplay } from '@/components/ui/author-display';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { useContent, useForum, usePermissions, useAuth } from '@/hooks';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShareButton } from '@/components/ui/ShareButton';

interface CommentCardProps {
  comment: Comment;
  postId: string;
  cellId?: string;
  canModerate: boolean;
  onModerateComment: (commentId: string) => void;
  onUnmoderateComment?: (commentId: string) => void;
  onModerateUser: (userAddress: string) => void;
}

// Extracted child component to respect Rules of Hooks
const PendingBadge: React.FC<{ id: string }> = ({ id }) => {
  const { content } = useForum();
  const isPending = content.pending.isPending(id);
  if (!isPending) return null;
  return (
    <>
      <span>•</span>
      <span className="px-2 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        syncing…
      </span>
    </>
  );
};

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  postId,
  cellId,
  canModerate,
  onModerateComment,
  onUnmoderateComment,
  onModerateUser,
}) => {
  const content = useContent();
  const permissions = usePermissions();
  const { currentUser } = useAuth();

  // Check if bookmarked
  const isBookmarked = content.bookmarks.some(
    b => b.targetId === comment.id && b.type === 'comment'
  );
  const [bookmarkLoading, setBookmarkLoading] = React.useState(false);

  // Use library pending API
  const commentVotePending = content.pending.isPending(comment.id);

  const score = comment.upvotes.length - comment.downvotes.length;
  const isModerated = Boolean(comment.moderated);
  const userDownvoted = Boolean(
    comment.downvotes.some(v => v.author === currentUser?.address)
  );
  const userUpvoted = Boolean(
    comment.upvotes.some(v => v.author === currentUser?.address)
  );
  const isOwnComment = currentUser?.address === comment.author;

  const handleVoteComment = async (isUpvote: boolean) => {
    await content.vote({ targetId: comment.id, isUpvote });
  };

  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      await content.toggleCommentBookmark(comment, postId);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div className="border-b border-border/20 py-3 pl-3 pr-2">
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5 text-sm min-w-[40px]">
          <button
            className={`hover:text-primary text-base ${userUpvoted ? 'text-primary' : 'text-muted-foreground'
              }`}
            onClick={() => handleVoteComment(true)}
            disabled={!permissions.canVote}
            title={
              permissions.canVote ? 'Upvote comment' : permissions.reasons.vote
            }
          >
            ▲
          </button>
          <span className={`font-mono text-sm ${score > 0 ? 'text-primary' : score < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {score}
          </span>
          <button
            className={`hover:text-blue-400 text-base ${userDownvoted ? 'text-blue-400' : 'text-muted-foreground'
              }`}
            onClick={() => handleVoteComment(false)}
            disabled={!permissions.canVote}
            title={
              permissions.canVote
                ? 'Downvote comment'
                : permissions.reasons.vote
            }
          >
            ▼
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-sm">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-2">
            <AuthorDisplay
              address={comment.author}
              className="text-xs"
              showBadge={false}
            />
            <span>·</span>
            <span className="text-muted-foreground/80">
              {formatDistanceToNow(new Date(comment.timestamp), {
                addSuffix: true,
              })}
            </span>
            {commentVotePending && (
              <>
                <span>·</span>
                <span className="text-yellow-400 text-xs">syncing</span>
              </>
            )}
          </div>

          {/* Content */}
          <div className="text-sm text-foreground leading-relaxed mb-2 prose prose-invert max-w-none">
            <MarkdownRenderer content={comment.content} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="hover:underline"
            >
              {isBookmarked ? 'unsave' : 'save'}
            </button>
            <ShareButton
              size="sm"
              url={`${window.location.origin}/post/${postId}#comment-${comment.id}`}
              title={
                comment.content.substring(0, 50) +
                (comment.content.length > 50 ? '...' : '')
              }
            />
            {canModerate && !isModerated && !isOwnComment && (
              <button
                onClick={() => onModerateComment(comment.id)}
                className="hover:underline text-orange-400"
                title="Moderate comment"
              >
                moderate
              </button>
            )}
            {canModerate && isModerated && !isOwnComment && (
              <button
                onClick={() => onUnmoderateComment?.(comment.id)}
                className="hover:underline text-green-400"
                title="Unmoderate comment"
              >
                unmoderate
              </button>
            )}
            {cellId && canModerate && !isOwnComment && (
              <button
                onClick={() => onModerateUser(comment.author)}
                className="hover:underline text-red-400"
                title="Moderate user"
              >
                ban user
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
