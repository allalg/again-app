import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors focus:outline-none font-sans',
  {
    variants: {
      variant: {
        default: 'border border-primary/40 bg-primary/10 text-primary',
        secondary: 'border border-border/80 bg-secondary/80 text-secondary-foreground',
        destructive: 'border border-destructive/40 bg-destructive/10 text-destructive',
        outline: 'border border-foreground/30 text-foreground bg-transparent',
        streak: 'border border-cinnabar-500/40 bg-cinnabar-500/10 text-cinnabar-600 dark:text-cinnabar-400 font-cinzel text-[10px] tracking-wider uppercase',
        completed: 'status-completed font-mono text-[10px] uppercase',
        missed: 'status-missed font-mono text-[10px] uppercase',
        pending: 'status-pending font-mono text-[10px] uppercase',
        submitted: 'status-submitted font-mono text-[10px] uppercase',
        disputed: 'status-disputed font-mono text-[10px] uppercase',
        excused: 'status-excused font-mono text-[10px] uppercase',
        active: 'bg-botanical-500/10 text-botanical-700 dark:text-botanical-300 border border-botanical-500/30 font-cinzel text-[10px] uppercase tracking-wider',
        paused: 'bg-gilt-500/10 text-gilt-700 dark:text-gilt-300 border border-gilt-500/30 font-cinzel text-[10px] uppercase tracking-wider',
        cancelled: 'bg-muted text-muted-foreground border border-border/60',
        stamp: 'border border-dashed border-primary/50 text-primary font-cinzel text-[10px] uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
