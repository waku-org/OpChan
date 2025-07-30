import React from 'react';
import { useForum } from '@/contexts/useForum';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareText, Newspaper } from 'lucide-react';

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
  const { posts, comments, cells, getCellById, isInitialLoading } = useForum();

  const combinedFeed: FeedItem[] = [
    ...posts.map((post): PostFeedItem => ({
      id: post.id,
      type: 'post',
      timestamp: post.timestamp,
      ownerAddress: post.authorAddress,
      title: post.title,
      cellId: post.cellId,
      postId: post.id,
      commentCount: 0, 
      voteCount: post.upvotes.length - post.downvotes.length,
    })),
    ...comments.map((comment): CommentFeedItem | null => {
      const parentPost = posts.find(p => p.id === comment.postId);
      if (!parentPost) return null; 
      return {
        id: comment.id,
        type: 'comment',
        timestamp: comment.timestamp,
        ownerAddress: comment.authorAddress,
        content: comment.content,
        postId: comment.postId,
        cellId: parentPost.cellId, 
        voteCount: comment.upvotes.length - comment.downvotes.length,
      };
    })
    .filter((item): item is CommentFeedItem => item !== null), 
  ].sort((a, b) => b.timestamp - a.timestamp); 

  const renderFeedItem = (item: FeedItem) => {
    const cell = item.cellId ? getCellById(item.cellId) : undefined;
    const ownerShort = `${item.ownerAddress.slice(0, 5)}...${item.ownerAddress.slice(-4)}`;
    const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });

    const linkTarget = item.type === 'post' ? `/post/${item.postId}` : `/post/${item.postId}#comment-${item.id}`;

    return (
      <Link 
        to={linkTarget} 
        key={item.id} 
        className="block border border-muted hover:border-primary/50 hover:bg-secondary/30 rounded-sm p-3 mb-3 transition-colors duration-150"
      >
        <div className="flex items-center text-xs text-muted-foreground mb-1.5">
          {item.type === 'post' ? <Newspaper className="w-3.5 h-3.5 mr-1.5 text-primary/80" /> : <MessageSquareText className="w-3.5 h-3.5 mr-1.5 text-accent/80" />}
          <span className="font-medium text-foreground/90 mr-1">
            {item.type === 'post' ? item.title : `Comment on: ${posts.find(p => p.id === item.postId)?.title || 'post'}`}
          </span>
           by
          <span className="font-medium text-foreground/70 mx-1">{ownerShort}</span>
          {cell && (
            <>
              in
              <span className="font-medium text-foreground/70 ml-1">/{cell.name}</span>
            </>
          )}
          <span className="ml-auto">{timeAgo}</span>
        </div>
        {item.type === 'comment' && (
          <p className="text-sm text-foreground/80 pl-5 truncate"> 
            {item.content}
          </p>
        )}
      </Link>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-primary">Latest Activity</h2>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-muted rounded-sm p-3 mb-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-primary">Latest Activity</h2>
      {combinedFeed.length === 0 ? (
        <p className="text-muted-foreground text-sm">No activity yet. Be the first to post!</p>
      ) : (
        combinedFeed.map(renderFeedItem)
      )}
    </div>
  );
};

export default ActivityFeed; 