import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-v4-red-500/10 text-v4-red-500 border border-v4-red-500/20',
        secondary: 'bg-v4-gray-800 text-v4-gray-300 border border-v4-gray-700',
        success: 'bg-v4-green/10 text-v4-green border border-v4-green/20',
        warning: 'bg-v4-yellow/10 text-v4-yellow border border-v4-yellow/20',
        destructive: 'bg-v4-red-600/10 text-v4-red-500 border border-v4-red-600/20',
        outline: 'border border-v4-gray-700 text-v4-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
