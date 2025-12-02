'use client';

import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

interface ConditionNodeData {
  variable?: string;
  operator?: string;
  value?: string;
}

export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900 shadow-lg min-w-[200px]',
        selected ? 'ring-2 ring-v4-red-500' : 'border-gray-700',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
      />

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-yellow-600">
        <GitBranch className="h-4 w-4 text-white" />
        <span className="font-medium text-sm text-white">Condição</span>
      </div>

      <div className="p-3 space-y-2">
        {data?.variable ? (
          <p className="text-sm text-white">
            Se <span className="text-yellow-400">{data.variable}</span> {data.operator || '='}{' '}
            <span className="text-yellow-400">{data.value}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-400">Clique para configurar...</p>
        )}
      </div>

      {/* Two output handles for true/false branches */}
      <div className="flex justify-around pb-2">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-700"
            style={{ left: 'calc(50% - 30px)' }}
          />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-green-400">
            Sim
          </span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-700"
            style={{ left: 'calc(50% + 30px)' }}
          />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400">
            Não
          </span>
        </div>
      </div>
    </div>
  );
}
