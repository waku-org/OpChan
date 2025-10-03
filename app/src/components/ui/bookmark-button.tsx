import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '../../utils';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  loading?: boolean;
  onClick: (e?: React.MouseEvent) => void;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  showText?: boolean;
}

export function BookmarkButton({
  isBookmarked,
  loading = false,
  onClick,
  size = 'sm',
  variant = 'ghost',
  className,
  showText = false,
}: BookmarkButtonProps) {
  const sizeClasses = {
    sm: 'h-8 w-10',
    lg: 'h-10 whitespace-nowrap px-4',
  };

  const iconSize = {
    sm: 14,
    lg: 18,
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={loading}
      className={cn(
        sizeClasses[size],
        'transition-colors duration-200',
        isBookmarked
          ? 'text-cyber-accent hover:text-cyber-light'
          : 'text-cyber-neutral hover:text-cyber-light',
        className
      )}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
      ) : isBookmarked ? (
        <BookmarkCheck size={iconSize[size]} className="fill-current" />
      ) : (
        <Bookmark size={iconSize[size]} />
      )}
      {showText && (
        <span className="ml-2 text-xs">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </Button>
  );
}

interface BookmarkIndicatorProps {
  isBookmarked: boolean;
  className?: string;
}

export function BookmarkIndicator({
  isBookmarked,
  className,
}: BookmarkIndicatorProps) {
  if (!isBookmarked) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyber-accent/10 text-cyber-accent text-xs',
        className
      )}
    >
      <BookmarkCheck size={12} className="fill-current" />
      <span>Bookmarked</span>
    </div>
  );
}
