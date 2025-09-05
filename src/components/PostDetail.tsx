import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  usePost,
  usePostComments,
  useForumActions,
  usePermissions,
  useUserVotes,
} from '@/hooks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  MessageCircle,
  Send,
  Loader2,
  Shield,
  UserX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { RelevanceIndicator } from './ui/relevance-indicator';
import { AuthorDisplay } from './ui/author-display';
import { usePending, usePendingVote } from '@/hooks/usePending';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  // ✅ Use reactive hooks for data and actions
  const post = usePost(postId);
  const comments = usePostComments(postId);
  const {
    createComment,
    votePost,
    voteComment,
    moderateComment,
    moderateUser,
    isCreatingComment,
    isVoting,
  } = useForumActions();
  const { canVote, canComment, canModerate } = usePermissions();
  const userVotes = useUserVotes();

  // ✅ Move ALL hook calls to the top, before any conditional logic
  const postPending = usePending(post?.id);
  const postVotePending = usePendingVote(post?.id);

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

    // ✅ All validation handled in hook
    const result = await createComment(postId, newComment);
    if (result) {
      setNewComment('');
    }
  };

  const handleVotePost = async (isUpvote: boolean) => {
    // ✅ Permission checking handled in hook
    await votePost(post.id, isUpvote);
  };

  const handleVoteComment = async (commentId: string, isUpvote: boolean) => {
    // ✅ Permission checking handled in hook
    await voteComment(commentId, isUpvote);
  };

  // ✅ Get vote status from hooks
  const postVoteType = userVotes.getPostVoteType(post.id);
  const isPostUpvoted = postVoteType === 'upvote';
  const isPostDownvoted = postVoteType === 'downvote';

  const getCommentVoteType = (commentId: string) => {
    return userVotes.getCommentVoteType(commentId);
  };

  const handleModerateComment = async (commentId: string) => {
    const reason =
      window.prompt('Enter a reason for moderation (optional):') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderateComment(cell.id, commentId, reason);
  };

  const handleModerateUser = async (userAddress: string) => {
    const reason =
      window.prompt('Reason for moderating this user? (optional)') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderateUser(cell.id, userAddress, reason);
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
                disabled={!canVote || isVoting}
                title={
                  canVote ? 'Upvote post' : 'Connect wallet and verify to vote'
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
                disabled={!canVote || isVoting}
                title={
                  canVote
                    ? 'Downvote post'
                    : 'Connect wallet and verify to vote'
                }
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              {postVotePending.isPending && (
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
                {postPending.isPending && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      syncing…
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold mb-3">{post.title}</h1>
              <p className="text-sm whitespace-pre-wrap break-words">
                {post.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {canComment && (
        <div className="mb-8">
          <form onSubmit={handleCreateComment}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              Add a comment
            </h2>
            <Textarea
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="mb-3 resize-none"
              disabled={isCreatingComment}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!canComment || isCreatingComment}
                className="bg-cyber-accent hover:bg-cyber-accent/80"
              >
                {isCreatingComment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!canComment && (
        <div className="mb-6 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20 text-center">
          <p className="text-sm mb-3">
            Connect wallet and verify Ordinal ownership to comment
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
              {canComment
                ? 'Be the first to share your thoughts!'
                : 'Connect your wallet to join the conversation.'}
            </p>
          </div>
        ) : (
          visibleComments.map(comment => (
            <div
              key={comment.id}
              className="border border-muted rounded-sm p-4 bg-card"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${
                      getCommentVoteType(comment.id) === 'upvote'
                        ? 'text-cyber-accent'
                        : ''
                    }`}
                    onClick={() => handleVoteComment(comment.id, true)}
                    disabled={!canVote || isVoting}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold">{comment.voteScore}</span>
                  <button
                    className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${
                      getCommentVoteType(comment.id) === 'downvote'
                        ? 'text-cyber-accent'
                        : ''
                    }`}
                    onClick={() => handleVoteComment(comment.id, false)}
                    disabled={!canVote || isVoting}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
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
                  <p className="text-sm break-words">{comment.content}</p>
                  {canModerate(cell?.id || '') && !comment.moderated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-cyber-neutral hover:text-orange-500"
                          onClick={() => handleModerateComment(comment.id)}
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Moderate comment</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {post.cell &&
                    canModerate(post.cell.id) &&
                    comment.author !== post.author && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-cyber-neutral hover:text-red-500"
                            onClick={() => handleModerateUser(comment.author)}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Moderate user</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  {comment.moderated && (
                    <span className="ml-2 text-xs text-red-500">
                      [Moderated]
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostDetail;
