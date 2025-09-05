import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useCell,
  useCellPosts,
  useForumActions,
  usePermissions,
  useUserVotes,
  useAuth,
} from '@/hooks';
import { EVerificationStatus } from '@/types/identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  Shield,
  UserX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CypherImage } from './ui/CypherImage';
import { Badge } from '@/components/ui/badge';
import { AuthorDisplay } from './ui/author-display';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PostList = () => {
  const { cellId } = useParams<{ cellId: string }>();

  // ✅ Use reactive hooks for data and actions
  const cell = useCell(cellId);
  const cellPosts = useCellPosts(cellId, { sortBy: 'relevance' });
  const {
    createPost,
    votePost,
    moderatePost,
    moderateUser,
    refreshData,
    isCreatingPost,
    isVoting,
  } = useForumActions();
  const { canPost, canVote, canModerate } = usePermissions();
  const userVotes = useUserVotes();
  const { currentUser, verificationStatus } = useAuth();

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  if (!cellId || cellPosts.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            to="/"
            className="text-cyber-accent hover:underline flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Cells
          </Link>
        </div>

        <Skeleton className="h-8 w-32 mb-6 bg-cyber-muted" />
        <Skeleton className="h-6 w-64 mb-6 bg-cyber-muted" />

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-cyber-muted rounded-sm p-4">
              <div className="mb-2">
                <Skeleton className="h-6 w-full mb-2 bg-cyber-muted" />
                <Skeleton className="h-6 w-3/4 mb-2 bg-cyber-muted" />
              </div>
              <Skeleton className="h-4 w-32 bg-cyber-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!cell) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            to="/"
            className="text-cyber-accent hover:underline flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Cells
          </Link>
        </div>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Cell Not Found</h1>
          <p className="text-cyber-neutral mb-6">
            The cell you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/">Return to Cells</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    // ✅ All validation handled in hook
    const post = await createPost(cellId, newPostTitle, newPostContent);
    if (post) {
      setNewPostTitle('');
      setNewPostContent('');
    }
  };

  const handleVotePost = async (postId: string, isUpvote: boolean) => {
    // ✅ Permission checking handled in hook
    await votePost(postId, isUpvote);
  };

  const getPostVoteType = (postId: string) => {
    return userVotes.getPostVoteType(postId);
  };

  // ✅ Posts already filtered by hook based on user permissions
  const visiblePosts = cellPosts.posts;

  const handleModerate = async (postId: string) => {
    const reason =
      window.prompt('Enter a reason for moderation (optional):') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderatePost(cell.id, postId, reason);
  };

  const handleModerateUser = async (userAddress: string) => {
    const reason =
      window.prompt('Reason for moderating this user? (optional)') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderateUser(cell.id, userAddress, reason);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          to="/"
          className="text-cyber-accent hover:underline flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cells
        </Link>
      </div>

      <div className="flex gap-4 items-start mb-6">
        <CypherImage
          src={cell.icon}
          alt={cell.name}
          className="w-12 h-12 object-cover rounded-sm border border-cyber-muted"
          generateUniqueFallback={true}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-glow">{cell.name}</h1>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={cellPosts.isLoading}
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${cellPosts.isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
          <p className="text-cyber-neutral">{cell.description}</p>
        </div>
      </div>

      {canPost && (
        <div className="mb-8">
          <form onSubmit={handleCreatePost}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              New Thread
            </h2>
            <div className="mb-3">
              <Input
                placeholder="Thread title"
                value={newPostTitle}
                onChange={e => setNewPostTitle(e.target.value)}
                className="mb-3 bg-cyber-muted/50 border-cyber-muted"
                disabled={isCreatingPost}
              />
              <Textarea
                placeholder="What's on your mind?"
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                className="bg-cyber-muted/50 border-cyber-muted resize-none"
                disabled={isCreatingPost}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isCreatingPost ||
                  !newPostContent.trim() ||
                  !newPostTitle.trim()
                }
              >
                {isCreatingPost ? 'Posting...' : 'Post Thread'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!canPost &&
        verificationStatus === EVerificationStatus.WALLET_CONNECTED && (
          <div className="mb-8 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-cyber-neutral" />
              <h3 className="font-medium">Read-Only Mode</h3>
            </div>
            <p className="text-sm text-cyber-neutral mb-2">
              Your wallet does not contain any Ordinal Operators. You can browse
              threads but cannot post or interact.
            </p>
            <Badge variant="outline" className="text-xs">
              No Ordinals Found
            </Badge>
          </div>
        )}

      {!canPost && !currentUser && (
        <div className="mb-8 p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20 text-center">
          <p className="text-sm mb-3">
            Connect wallet and verify Ordinal ownership to post
          </p>
          <Button asChild size="sm">
            <Link to="/">Connect Wallet</Link>
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {visiblePosts.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-cyber-neutral opacity-50" />
            <h2 className="text-xl font-bold mb-2">No Threads Yet</h2>
            <p className="text-cyber-neutral">
              {canPost
                ? 'Be the first to post in this cell!'
                : 'Connect your wallet and verify Ordinal ownership to start a thread.'}
            </p>
          </div>
        ) : (
          visiblePosts.map(post => (
            <div
              key={post.id}
              className="post-card p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20 hover:bg-cyber-muted/30 transition duration-200"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${getPostVoteType(post.id) === 'upvote' ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVotePost(post.id, true)}
                    disabled={!canVote || isVoting}
                    title={
                      canVote ? 'Upvote' : 'Connect wallet and verify to vote'
                    }
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-sm py-1">
                    {post.upvotes.length - post.downvotes.length}
                  </span>
                  <button
                    className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${getPostVoteType(post.id) === 'downvote' ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVotePost(post.id, false)}
                    disabled={!canVote || isVoting}
                    title={
                      canVote ? 'Downvote' : 'Connect wallet and verify to vote'
                    }
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <Link to={`/post/${post.id}`} className="block">
                    <h2 className="text-lg font-bold hover:text-cyber-accent">
                      {post.title}
                    </h2>
                    <p className="line-clamp-2 text-sm mb-3">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-cyber-neutral">
                      <span>
                        {formatDistanceToNow(post.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                      <span>by </span>
                      <AuthorDisplay
                        address={post.author}
                        className="text-xs"
                        showBadge={false}
                      />
                    </div>
                  </Link>
                  {canModerate(cell.id) && !post.moderated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-cyber-neutral hover:text-orange-500"
                          onClick={() => handleModerate(post.id)}
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Moderate post</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canModerate(cell.id) && post.author !== cell.author && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-cyber-neutral hover:text-red-500"
                          onClick={() => handleModerateUser(post.author)}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Moderate user</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {post.moderated && (
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

export default PostList;
