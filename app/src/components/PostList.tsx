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
import { LinkRenderer } from '@/components/ui/link-renderer';
import {
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  MessageSquareX,
  UserX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InlineCallSignInput } from './ui/inline-callsign-input';
import { EVerificationStatus } from '@opchan/core';

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

  if (!cellId || !cell) {
    return (
      <div className="w-full mx-auto px-2 py-2 max-w-4xl">
        <Link to="/" className="text-primary hover:underline text-xs">
          ← Back
        </Link>
        <div className="py-4 text-xs text-muted-foreground">
          {!cellId ? 'Loading...' : 'Cell not found'}
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
    <div className="w-full mx-auto px-2 py-2 max-w-4xl">
      <div className="mb-2 pb-1 border-b border-border/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-primary hover:underline">
            ← Back
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="font-semibold text-foreground">r/{cell.name}</span>
          <span className="text-muted-foreground text-[10px]">{cell.description}</span>
        </div>
        <button
          onClick={refresh}
          className="text-muted-foreground hover:text-foreground text-[10px]"
        >
          refresh
        </button>
      </div>

      {canPost && (
        <div className="mb-2 border-b border-border/30 pb-2">
          <form onSubmit={handleCreatePost} onKeyDown={handleKeyDown}>
            <div className="text-[10px] font-semibold mb-1">NEW THREAD</div>
            <Input
              placeholder="Title"
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              className="mb-1 text-xs h-7"
              disabled={isCreatingPost}
            />
            <Textarea
              placeholder="Content"
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              className="text-xs resize-none h-16"
              disabled={isCreatingPost}
            />
            <div className="flex justify-end mt-1">
              <button
                type="submit"
                disabled={
                  isCreatingPost ||
                  !newPostContent.trim() ||
                  !newPostTitle.trim()
                }
                className="text-primary hover:underline text-[10px] disabled:opacity-50"
              >
                {isCreatingPost ? 'posting...' : 'post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!canPost && !currentUser && (
        <div className="mb-2 py-2 text-xs text-center text-muted-foreground border-b border-border/30">
          Connect wallet to post
        </div>
      )}

      <div>
        {visiblePosts.length === 0 ? (
          <div className="py-4 text-xs text-muted-foreground text-center">
            No threads yet. {canPost ? 'Be the first to post!' : 'Connect wallet to post.'}
          </div>
        ) : (
          visiblePosts.map((post: ForumPost) => (
            <div key={post.id} className="border-b border-border/30 py-1.5 text-xs">
              <div className="flex items-start gap-2">
                <button
                  className={`${getPostVoteType(post.id) === 'upvote' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
                  onClick={() => handleVotePost(post.id, true)}
                  disabled={!canVote || isVoting}
                >
                  ▲
                </button>
                <span className={`font-mono text-xs min-w-[2ch] text-center ${(post.upvotes.length - post.downvotes.length) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {post.upvotes.length - post.downvotes.length}
                </span>
                <button
                  className={`${getPostVoteType(post.id) === 'downvote' ? 'text-blue-400' : 'text-muted-foreground'} hover:text-blue-400`}
                  onClick={() => handleVotePost(post.id, false)}
                  disabled={!canVote || isVoting}
                >
                  ▼
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <Link to={`/post/${post.id}`} className="text-foreground hover:underline font-medium">
                      {post.title}
                    </Link>
                    <span className="text-muted-foreground text-[10px]">
                      by {post.author.slice(0, 6)}...{post.author.slice(-4)}
                    </span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <span className="text-muted-foreground text-[10px]">
                      {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                    </span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <Link to={`/post/${post.id}`} className="text-muted-foreground hover:underline text-[10px]">
                      {commentsByPost[post.id]?.length || 0} comments
                    </Link>
                    {canModerate(cell.id) && !post.moderated && (
                      <>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <button
                          onClick={() => handleModerate(post.id)}
                          className="text-orange-400 hover:underline text-[10px]"
                        >
                          moderate
                        </button>
                      </>
                    )}
                    {canModerate(cell.id) && post.moderated && (
                      <>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <button
                          onClick={() => handleUnmoderate(post.id)}
                          className="text-green-400 hover:underline text-[10px]"
                        >
                          unmoderate
                        </button>
                      </>
                    )}
                  </div>
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
