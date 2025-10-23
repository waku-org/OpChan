import React, { useMemo } from 'react';
import { useForum } from '@/hooks';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareText, Newspaper } from 'lucide-react';
import { AuthorDisplay } from './ui/author-display';
import { LinkRenderer } from './ui/link-renderer';

interface FeedItemBase {
  id: string;
  type: 'post' | 'comment';
  timestamp: number;
  ownerAddress: string;
  cellId?: string;
  postId?: string;
}

interface PostFeedItem extends FeedItemBase {
  type: 'post';
  title: string;
  cellId: string;
  postId: string;
  commentCount: number;
  voteCount: number;
}

interface CommentFeedItem extends FeedItemBase {
  type: 'comment';
  content: string;
  postId: string;
  voteCount: number;
}

type FeedItem = PostFeedItem | CommentFeedItem;

const ActivityFeed: React.FC = () => {
  const { content, network } = useForum();

  const { posts, comments, cells, commentsByPost } = content;
  const { isHydrated } = network;


  const combinedFeed: FeedItem[] = useMemo(() => {
    return [
      ...posts.map(
        (post): PostFeedItem => ({
          ...post,
          type: 'post',
          ownerAddress: post.authorAddress,
          cellId: post.cellId,
          postId: post.id,
          title: post.title,
          commentCount: commentsByPost[post.id]?.length || 0,
          voteCount: post.upvotes.length - post.downvotes.length,
        })
      ),
      ...comments
        .map((comment): CommentFeedItem | null => {
          const parentPost = posts.find(p => p.id === comment.postId);
          if (!parentPost) return null;
          return {
            id: comment.id,
            type: 'comment',
            timestamp: comment.timestamp,
            ownerAddress: comment.author,
            content: comment.content,
            postId: comment.postId,
            cellId: parentPost.cellId,
            voteCount: comment.upvotes.length - comment.downvotes.length,
          };
        })
        .filter((item): item is CommentFeedItem => item !== null),
    ].sort((a, b) => b.timestamp - a.timestamp);
  }, [posts, comments, commentsByPost]);

  const renderFeedItem = (item: FeedItem) => {
    const cell = item.cellId
      ? cells.find(c => c.id === item.cellId)
      : undefined;
    const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
      addSuffix: true,
    });

    const linkTarget =
      item.type === 'post' ? `/post/${item.id}` : `/post/${item.postId}`;

    return (
      <div
        key={item.id}
        className="border border-cyber-muted rounded-sm p-3 bg-cyber-muted/10 hover:bg-cyber-muted/20 transition-colors"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {item.type === 'post' ? (
              <Newspaper className="w-5 h-5 text-cyber-accent" />
            ) : (
              <MessageSquareText className="w-5 h-5 text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
              <AuthorDisplay
                address={item.ownerAddress}
                className="text-xs"
                showBadge={false}
              />
              <span>•</span>
              <span>{timeAgo}</span>
              {cell && (
                <>
                  <span>•</span>
                  <span className="text-cyber-accent">r/{cell.name}</span>
                </>
              )}
            </div>

            <Link to={linkTarget} className="block hover:opacity-80">
              {item.type === 'post' ? (
                <div>
                  <div className="font-medium text-sm mb-1 line-clamp-2">
                    {item.title}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>↑ {item.voteCount}</span>
                    <span>{item.commentCount} comments</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm line-clamp-3 mb-1">
                    <LinkRenderer text={item.content} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ↑ {item.voteCount} • Reply to post
                  </div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Show loading skeleton only while store is hydrating
  if (!isHydrated) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-cyber-muted rounded-sm p-3">
            <div className="flex items-start space-x-3">
              <Skeleton className="w-5 h-5 rounded bg-cyber-muted" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-cyber-muted" />
                <Skeleton className="h-3 w-1/2 bg-cyber-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (combinedFeed.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-bold mb-2">No Activity Yet</h3>
        <p className="text-muted-foreground">
          Be the first to create a post or comment!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {combinedFeed.slice(0, 20).map(renderFeedItem)}
    </div>
  );
};

export default ActivityFeed;
