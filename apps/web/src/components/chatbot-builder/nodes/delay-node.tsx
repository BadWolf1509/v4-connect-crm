'use client';

import { Clock } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

interface DelayNodeData {
  seconds?: number;
}

export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <BaseNode
      title="Aguardar"
      icon={<Clock className="h-4 w-4 text-white" />}
      color="bg-orange-600"
      selected={selected}
    >
      <p className="text-sm text-white text-center">
        {data?.seconds ? formatDuration(data.seconds) : 'Defina o tempo...'}
      </p>
    </BaseNode>
  );
}
