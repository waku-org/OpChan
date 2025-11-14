import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-none border border-border bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ring-offset-background transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'text-foreground hover:bg-white/10',
        destructive:
          'border-destructive text-destructive hover:bg-destructive/20',
        outline:
          'border-border text-foreground hover:bg-white/5 hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'border border-transparent text-muted-foreground hover:border-border hover:bg-white/5 hover:text-foreground',
        link: 'border-0 px-0 py-0 text-primary underline-offset-4 hover:underline tracking-normal',
      },
      size: {
        default: 'px-3 py-2',
        sm: 'px-2 py-1 text-[10px]',
        lg: 'px-4 py-3 text-[12px]',
        icon: 'w-10 h-10 px-0 py-0 justify-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
