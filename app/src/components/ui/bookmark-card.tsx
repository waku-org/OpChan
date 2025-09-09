import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bookmark as BookmarkIcon,
  MessageSquare,
  FileText,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Bookmark, BookmarkType } from '@/types/forum';
import { useUserDisplay } from '@/hooks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onRemove: (bookmarkId: string) => void;
  onNavigate?: (bookmark: Bookmark) => void;
  className?: string;
}

export function BookmarkCard({
  bookmark,
  onRemove,
  onNavigate,
  className,
}: BookmarkCardProps) {
  const authorInfo = useUserDisplay(bookmark.author || '');
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(bookmark);
    } else {
      // Default navigation behavior
      if (bookmark.type === BookmarkType.POST) {
        navigate(`/post/${bookmark.targetId}`);
      } else if (bookmark.type === BookmarkType.COMMENT && bookmark.postId) {
        navigate(`/post/${bookmark.postId}#comment-${bookmark.targetId}`);
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(bookmark.id);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:bg-cyber-muted/20 hover:border-cyber-accent/30',
        className
      )}
      onClick={handleNavigate}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {bookmark.type === BookmarkType.POST ? (
              <FileText size={16} className="text-cyber-accent flex-shrink-0" />
            ) : (
              <MessageSquare
                size={16}
                className="text-cyber-accent flex-shrink-0"
              />
            )}
            <Badge
              variant="outline"
              className="text-xs border-cyber-accent/30 text-cyber-accent"
            >
              {bookmark.type === BookmarkType.POST ? 'Post' : 'Comment'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-cyber-neutral hover:text-red-400"
            title="Remove bookmark"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Title/Content Preview */}
          <div>
            <h3 className="font-medium text-cyber-light line-clamp-2">
              {bookmark.title || 'Untitled'}
            </h3>
          </div>

          {/* Author and Metadata */}
          <div className="flex items-center justify-between text-sm text-cyber-neutral">
            <div className="flex items-center gap-2">
              <span>by</span>
              <span className="font-medium text-cyber-light">
                {authorInfo.displayName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {formatDistanceToNow(new Date(bookmark.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <ExternalLink size={12} className="opacity-50" />
            </div>
          </div>

          {/* Additional Context */}
          {bookmark.cellId && (
            <div className="text-xs text-cyber-neutral">
              Cell: {bookmark.cellId}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onRemove: (bookmarkId: string) => void;
  onNavigate?: (bookmark: Bookmark) => void;
  emptyMessage?: string;
  className?: string;
}

export function BookmarkList({
  bookmarks,
  onRemove,
  onNavigate,
  emptyMessage = 'No bookmarks yet',
  className,
}: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <BookmarkIcon size={48} className="text-cyber-neutral/50 mb-4" />
        <h3 className="text-lg font-medium text-cyber-light mb-2">
          {emptyMessage}
        </h3>
        <p className="text-cyber-neutral max-w-md">
          Bookmark posts and comments you want to revisit later. Your bookmarks
          are saved locally and won't be shared.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {bookmarks.map(bookmark => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onRemove={onRemove}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
