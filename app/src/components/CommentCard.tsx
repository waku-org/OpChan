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
    <div className="border border-border rounded-none p-2 sm:p-4 bg-transparent">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-2 sm:gap-2 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-border/60 pb-2 sm:pb-0 sm:pr-4">
          <div className="flex flex-row sm:flex-col items-center gap-2">
            <button
              className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                userUpvoted
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              onClick={() => handleVoteComment(true)}
              disabled={!permissions.canVote}
              title={
                permissions.canVote ? 'Upvote comment' : permissions.reasons.vote
              }
            >
              <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-foreground min-w-[20px] sm:min-w-[24px] text-center">{score}</span>
            <button
              className={`p-1.5 sm:p-1 border border-transparent hover:border-border touch-manipulation ${
                userDownvoted
                  ? 'text-blue-400'
                  : 'text-muted-foreground hover:text-blue-400'
              }`}
              onClick={() => handleVoteComment(false)}
              disabled={!permissions.canVote}
              title={
                permissions.canVote
                  ? 'Downvote comment'
                  : permissions.reasons.vote
              }
            >
              <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          {commentVotePending && (
            <span className="text-[9px] sm:text-[10px] text-yellow-400 sm:mt-1 whitespace-nowrap">
              syncing…
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <AuthorDisplay
                address={comment.author}
                className="text-[10px] sm:text-xs truncate"
                showBadge={false}
              />
              <span className="hidden sm:inline">•</span>
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="normal-case tracking-normal text-foreground text-[10px] sm:text-xs">
                {formatDistanceToNow(new Date(comment.timestamp), {
                  addSuffix: true,
                })}
              </span>
              <PendingBadge id={comment.id} />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <ShareButton
                size="sm"
                url={`${window.location.origin}/post/${postId}#comment-${comment.id}`}
                title={
                  comment.content.substring(0, 50) +
                  (comment.content.length > 50 ? '...' : '')
                }
              />
              <BookmarkButton
                isBookmarked={isBookmarked}
                loading={bookmarkLoading}
                onClick={handleBookmark}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>

          <div className="text-xs sm:text-sm break-words mb-2 sm:mb-3 prose prose-invert max-w-none">
            <MarkdownRenderer content={comment.content} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {canModerate && !isModerated && !isOwnComment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-orange-500 touch-manipulation"
                    onClick={() => onModerateComment(comment.id)}
                  >
                    <MessageSquareX className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Moderate comment</p>
                </TooltipContent>
              </Tooltip>
            )}
            {canModerate && isModerated && !isOwnComment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] text-muted-foreground hover:text-green-500 touch-manipulation"
                    onClick={() => onUnmoderateComment?.(comment.id)}
                  >
                    Unmoderate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unmoderate comment</p>
                </TooltipContent>
              </Tooltip>
            )}
            {cellId && canModerate && !isOwnComment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-red-500 touch-manipulation"
                    onClick={() => onModerateUser(comment.author)}
                  >
                    <UserX className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Moderate user</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
