import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { cn } from '@opchan/core';
import { useToast } from '../ui/use-toast';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  showText?: boolean;
}

export function ShareButton({
  url,
  size = 'sm',
  variant = 'ghost',
  className,
  showText = false,
}: ShareButtonProps) {
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'h-8 w-10',
    lg: 'h-10 whitespace-nowrap px-4',
  };

  const iconSize = {
    sm: 14,
    lg: 18,
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: 'Link has been copied to your clipboard.',
      });
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      toast({
        title: 'Link copied!',
        description: 'Link has been copied to your clipboard.',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={cn(
        sizeClasses[size],
        'transition-colors duration-200 text-cyber-neutral hover:text-cyber-light',
        className
      )}
      title="Copy link"
    >
      <Share2 size={iconSize[size]} />
      {showText && <span className="ml-2 text-xs">Share</span>}
    </Button>
  );
}
