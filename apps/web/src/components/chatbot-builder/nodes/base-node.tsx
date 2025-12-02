'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Handle, Position } from 'reactflow';

interface BaseNodeProps {
  children: ReactNode;
  title: string;
  icon: ReactNode;
  color: string;
  selected?: boolean;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}

export function BaseNode({
  children,
  title,
  icon,
  color,
  selected,
  showSourceHandle = true,
  showTargetHandle = true,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900 shadow-lg min-w-[200px]',
        selected ? 'ring-2 ring-v4-red-500' : 'border-gray-700',
      )}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
        />
      )}

      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-lg', color)}>
        {icon}
        <span className="font-medium text-sm text-white">{title}</span>
      </div>

      <div className="p-3">{children}</div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
        />
      )}
    </div>
  );
}
