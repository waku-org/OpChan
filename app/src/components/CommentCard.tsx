import React from 'react';
import { ArrowUp, ArrowDown, Clock, Shield, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@opchan/core';
import {
  useForumActions,
  usePermissions,
  useUserVotes,
  useCommentBookmark,
} from '@/hooks';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/ui/bookmark-button';
import { AuthorDisplay } from '@/components/ui/author-display';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { usePending, usePendingVote } from '@/hooks/usePending';
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
  const { isPending } = usePending(id);
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
  const { voteComment, isVoting } = useForumActions();
  const { canVote } = usePermissions();
  const userVotes = useUserVotes();
  const {
    isBookmarked,
    loading: bookmarkLoading,
    toggleBookmark,
  } = useCommentBookmark(comment, postId);

  const commentVotePending = usePendingVote(comment.id);

  const handleVoteComment = async (isUpvote: boolean) => {
    await voteComment(comment.id, isUpvote);
  };

  const handleBookmark = async () => {
    await toggleBookmark();
  };

  const getCommentVoteType = () => {
    return userVotes.getCommentVoteType(comment.id);
  };

  return (
    <div className="border border-muted rounded-sm p-4 bg-card">
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <button
            className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${
              getCommentVoteType() === 'upvote' ? 'text-cyber-accent' : ''
            }`}
            onClick={() => handleVoteComment(true)}
            disabled={!canVote || isVoting}
            title={
              canVote ? 'Upvote comment' : 'Connect wallet and verify to vote'
            }
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <span className="text-sm font-bold">{comment.voteScore}</span>
          <button
            className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${
              getCommentVoteType() === 'downvote' ? 'text-cyber-accent' : ''
            }`}
            onClick={() => handleVoteComment(false)}
            disabled={!canVote || isVoting}
            title={
              canVote ? 'Downvote comment' : 'Connect wallet and verify to vote'
            }
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          {commentVotePending.isPending && (
            <span className="mt-1 text-[10px] text-yellow-500">syncing…</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AuthorDisplay
                address={comment.author}
                className="text-xs"
                showBadge={false}
              />
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(comment.timestamp), {
                  addSuffix: true,
                })}
              </span>
              <PendingBadge id={comment.id} />
            </div>
            <div className="flex items-center gap-2">
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

          <div className="text-sm break-words mb-2 prose prose-invert max-w-none">
            <MarkdownRenderer content={comment.content} />
          </div>

          <div className="flex items-center gap-2">
            {canModerate && !comment.moderated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-cyber-neutral hover:text-orange-500"
                    onClick={() => onModerateComment(comment.id)}
                  >
                    <Shield className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Moderate comment</p>
                </TooltipContent>
              </Tooltip>
            )}
            {canModerate && comment.moderated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-cyber-neutral hover:text-green-500"
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
            {cellId && canModerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-cyber-neutral hover:text-red-500"
                    onClick={() => onModerateUser(comment.author)}
                  >
                    <UserX className="h-3 w-3" />
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
