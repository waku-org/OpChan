import { cn } from '../../utils';
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
  className,
}: ShareButtonProps) {
  const { toast } = useToast();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Link copied to clipboard',
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
        title: 'Link copied',
        description: 'Link copied to clipboard',
      });
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn('hover:underline', className)}
      title="Copy link"
    >
      share
    </button>
  );
}
