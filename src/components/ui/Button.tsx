import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-border/80 bg-card/60 text-foreground shadow-sm hover:bg-accent/80 hover:text-accent-foreground hover:border-foreground/30',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent/70 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        streak:
          'bg-cinnabar-500 text-white shadow-[0_2px_12px_rgba(194,75,56,0.25)] hover:bg-cinnabar-600 hover:shadow-[0_4px_16px_rgba(194,75,56,0.35)] font-serif font-semibold tracking-wide',
        ember:
          'bg-cinnabar-500 text-white shadow-[0_2px_12px_rgba(194,75,56,0.25)] hover:bg-cinnabar-600 font-semibold',
        jade:
          'bg-botanical-500 text-white shadow-[0_2px_12px_rgba(61,97,78,0.25)] hover:bg-botanical-600 font-semibold',
        cinnabar:
          'bg-cinnabar-500 text-white shadow-[0_2px_12px_rgba(194,75,56,0.25)] hover:bg-cinnabar-600 font-semibold',
        botanical:
          'bg-botanical-500 text-white shadow-[0_2px_12px_rgba(61,97,78,0.25)] hover:bg-botanical-600 font-semibold',
        gilt:
          'bg-gilt-500 text-ink-900 shadow-[0_2px_12px_rgba(194,147,54,0.25)] hover:bg-gilt-400 font-semibold',
        stamp:
          'rounded-full border border-foreground/40 bg-transparent text-foreground hover:bg-foreground hover:text-background font-cinzel text-xs uppercase tracking-[0.2em]',
        editorial:
          'bg-ink-900 text-parchment-100 hover:bg-ink-800 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-parchment-200 font-cinzel text-xs uppercase tracking-widest',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-7 text-base font-serif',
        xl: 'h-13 rounded-lg px-8 text-base font-serif font-semibold',
        stamp: 'h-11 rounded-full px-6 text-xs',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
