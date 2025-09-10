import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageSquare, Clipboard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/types/forum';
import {
  useForumActions,
  usePermissions,
  useUserVotes,
  useForumData,
  usePostBookmark,
} from '@/hooks';
import { RelevanceIndicator } from '@/components/ui/relevance-indicator';
import { AuthorDisplay } from '@/components/ui/author-display';
import { BookmarkButton } from '@/components/ui/bookmark-button';
import { LinkRenderer } from '@/components/ui/link-renderer';
import { usePending, usePendingVote } from '@/hooks/usePending';
import { useToast } from '@/components/ui/use-toast';

interface PostCardProps {
  post: Post;
  commentCount?: number;
}

const PostCard: React.FC<PostCardProps> = ({ post, commentCount = 0 }) => {
  const { cellsWithStats } = useForumData();
  const { votePost, isVoting } = useForumActions();
  const { canVote } = usePermissions();
  const userVotes = useUserVotes();
  const {
    isBookmarked,
    loading: bookmarkLoading,
    toggleBookmark,
  } = usePostBookmark(post, post.cellId);
  const { toast } = useToast();

  // ✅ Get pre-computed cell data
  const cell = cellsWithStats.find(c => c.id === post.cellId);
  const cellName = cell?.name || 'unknown';

  // ✅ Use pre-computed vote data (assuming post comes from useForumData)
  const score =
    'voteScore' in post
      ? (post.voteScore as number)
      : post.upvotes.length - post.downvotes.length;
  const { isPending } = usePending(post.id);
  const votePending = usePendingVote(post.id);

  // ✅ Get user vote status from hook
  const userVoteType = userVotes.getPostVoteType(post.id);
  const userUpvoted = userVoteType === 'upvote';
  const userDownvoted = userVoteType === 'downvote';

  // ✅ Content truncation (simple presentation logic is OK)
  const contentPreview =
    post.content.length > 200
      ? post.content.substring(0, 200) + '...'
      : post.content;

  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault();
    // ✅ All validation and permission checking handled in hook
    await votePost(post.id, isUpvote);
  };

  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await toggleBookmark();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const postUrl = `${window.location.origin}/post/${post.id}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: 'Link copied!',
        description: 'Post link has been copied to your clipboard.',
      });
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      toast({
        title: 'Link copied!',
        description: 'Post link has been copied to your clipboard.',
      });
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
            disabled={!canVote || isVoting}
            title={canVote ? 'Upvote' : 'Connect wallet and verify to vote'}
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
            disabled={!canVote || isVoting}
            title={canVote ? 'Downvote' : 'Connect wallet and verify to vote'}
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          {votePending.isPending && (
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
              {post.relevanceScore !== undefined && (
                <>
                  <span>•</span>
                  <RelevanceIndicator
                    score={post.relevanceScore}
                    details={post.relevanceDetails}
                    type="post"
                    className="text-xs"
                    showTooltip={true}
                  />
                </>
              )}
            </div>

            {/* Post title and content - clickable to navigate to post */}
            <Link to={`/post/${post.id}`} className="block">
              <h2 className="text-lg font-semibold text-glow mb-2 hover:text-cyber-accent transition-colors">
                {post.title}
              </h2>

              {/* Post content preview */}
              <p className="text-cyber-neutral text-sm leading-relaxed mb-3">
                <LinkRenderer text={contentPreview} />
              </p>
            </Link>

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
                <button
                  onClick={handleShare}
                  className="hover:text-cyber-accent transition-colors flex items-center gap-1"
                  title="Copy link"
                >
                  <Clipboard size={14} />
                  Share
                </button>
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
