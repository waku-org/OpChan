import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePermissions, useAuth, useContent } from '@/hooks';
import type {
  Post as ForumPost,
  Cell as ForumCell,
  VoteMessage,
} from '@opchan/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkRenderer } from '@/components/ui/link-renderer';
import { RelevanceIndicator } from '@/components/ui/relevance-indicator';
import { ShareButton } from '@/components/ui/ShareButton';
import {
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Shield,
  UserX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CypherImage } from './ui/CypherImage';
import { AuthorDisplay } from './ui/author-display';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PostList = () => {
  const { cellId } = useParams<{ cellId: string }>();

  const { createPost, vote, moderate, refresh, commentsByPost, cells, posts } =
    useContent();
  const cell = cells.find((c: ForumCell) => c.id === cellId);
  const isCreatingPost = false;
  const isVoting = false;
  const { canPost, canVote, canModerate } = usePermissions();
  const { currentUser } = useAuth();

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  if (!cellId) {
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
    const post = await createPost({
      cellId,
      title: newPostTitle,
      content: newPostContent,
    });
    if (post) {
      setNewPostTitle('');
      setNewPostContent('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter inserts newline by default. Send on Ctrl+Enter or Shift+Enter.
    const isSendCombo =
      (e.ctrlKey || e.metaKey || e.shiftKey) && e.key === 'Enter';
    if (isSendCombo) {
      e.preventDefault();
      if (!isCreatingPost && newPostContent.trim() && newPostTitle.trim()) {
        handleCreatePost(e as React.FormEvent);
      }
    }
  };

  const handleVotePost = async (postId: string, isUpvote: boolean) => {
    await vote({ targetId: postId, isUpvote });
  };

  const getPostVoteType = (postId: string) => {
    if (!currentUser) return null;
    const p = posts.find((p: ForumPost) => p.id === postId);
    if (!p) return null;
    const up = p.upvotes.some(
      (v: VoteMessage) => v.author === currentUser.address
    );
    const down = p.downvotes.some(
      (v: VoteMessage) => v.author === currentUser.address
    );
    return up ? 'upvote' : down ? 'downvote' : null;
  };

  // ✅ Posts already filtered by hook based on user permissions
  const visiblePosts = posts
    .filter((p: ForumPost) => p.cellId === cellId)
    .sort((a: ForumPost, b: ForumPost) => {
      const ar = a.relevanceScore ?? 0;
      const br = b.relevanceScore ?? 0;
      return br - ar || b.timestamp - a.timestamp;
    });

  const handleModerate = async (postId: string) => {
    const reason =
      window.prompt('Enter a reason for moderation (optional):') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderate.post(cell.id, postId, reason);
  };

  const handleUnmoderate = async (postId: string) => {
    const reason =
      window.prompt('Optional note for unmoderation?') || undefined;
    if (!cell) return;
    await moderate.unpost(cell.id, postId, reason);
  };

  const handleModerateUser = async (userAddress: string) => {
    const reason =
      window.prompt('Reason for moderating this user? (optional)') || undefined;
    if (!cell) return;
    // ✅ All validation handled in hook
    await moderate.user(cell.id, userAddress, reason);
  };

  return (
    <div className="page-main">
      <div className="content-spacing">
        <Link
          to="/"
          className="text-cyber-accent hover:underline flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cells
        </Link>
      </div>

      <div className="flex gap-4 items-start content-spacing">
        <CypherImage
          src={cell.icon}
          alt={cell.name}
          className="w-12 h-12 object-cover rounded-sm border border-cyber-muted"
          generateUniqueFallback={true}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="page-title text-glow">{cell.name}</h1>
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={false}
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="page-subtitle">{cell.description}</p>
        </div>
      </div>

      {canPost && (
        <div className="section-spacing">
          <form onSubmit={handleCreatePost} onKeyDown={handleKeyDown}>
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
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 mb-2">
              <span>
                Press Enter for newline • Ctrl+Enter or Shift+Enter to post
              </span>
              <span />
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

      {!canPost && !currentUser && (
        <div className="section-spacing content-card-sm text-center">
          <p className="text-sm mb-3">Connect your wallet to post</p>
          <Button asChild size="sm">
            <Link to="/">Connect Wallet</Link>
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {visiblePosts.length === 0 ? (
          <div className="empty-state">
            <MessageCircle className="empty-state-icon text-cyber-neutral opacity-50" />
            <h2 className="empty-state-title">No Threads Yet</h2>
            <p className="empty-state-description">
              {canPost
                ? 'Be the first to post in this cell!'
                : 'Connect your wallet to start a thread.'}
            </p>
          </div>
        ) : (
          visiblePosts.map((post: ForumPost) => (
            <div key={post.id} className="thread-card">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    className={`p-1 rounded-sm hover:bg-cyber-muted/50 ${getPostVoteType(post.id) === 'upvote' ? 'text-cyber-accent' : ''}`}
                    onClick={() => handleVotePost(post.id, true)}
                    disabled={!canVote || isVoting}
                    title={canVote ? 'Upvote' : 'Connect your wallet to vote'}
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
                    title={canVote ? 'Downvote' : 'Connect your wallet to vote'}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <Link to={`/post/${post.id}`} className="block">
                    <h2 className="text-lg font-bold hover:text-cyber-accent">
                      {post.title}
                    </h2>
                    <p className="line-clamp-2 text-sm mb-3">
                      <LinkRenderer text={post.content} />
                    </p>
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
                      <span>•</span>
                      <span>
                        <MessageSquare className="inline w-3 h-3 mr-1" />
                        {commentsByPost[post.id]?.length || 0} comments
                      </span>
                      {typeof post.relevanceScore === 'number' && (
                        <>
                          <span>•</span>
                          <RelevanceIndicator
                            score={post.relevanceScore}
                            details={post.relevanceDetails}
                            type="post"
                            showTooltip={true}
                          />
                        </>
                      )}
                      <ShareButton
                        url={`${window.location.origin}/post/${post.id}`}
                        title={post.title}
                        description={post.content}
                        size="sm"
                        variant="ghost"
                        className="text-cyber-neutral"
                        showText={false}
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
                  {canModerate(cell.id) && post.moderated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-cyber-neutral hover:text-green-500"
                          onClick={() => handleUnmoderate(post.id)}
                        >
                          Unmoderate
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unmoderate post</p>
                      </TooltipContent>
                    </Tooltip>
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
