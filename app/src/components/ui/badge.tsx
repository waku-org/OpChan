import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-none bg-transparent focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-border text-foreground',
        secondary:
          'border-secondary bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive text-destructive',
        outline: 'border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        className={cn(badgeVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
