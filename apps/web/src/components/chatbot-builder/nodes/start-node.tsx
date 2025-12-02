'use client';

import { Play } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

export function StartNode({ selected }: NodeProps) {
  return (
    <BaseNode
      title="Início"
      icon={<Play className="h-4 w-4 text-white" />}
      color="bg-green-600"
      selected={selected}
      showTargetHandle={false}
    >
      <p className="text-xs text-gray-400">O fluxo inicia aqui</p>
    </BaseNode>
  );
}
