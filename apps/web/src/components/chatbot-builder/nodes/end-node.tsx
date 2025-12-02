'use client';

import { CircleStop } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

interface EndNodeData {
  action?: 'transfer_human' | 'close' | 'none';
}

const END_ACTIONS: Record<string, string> = {
  transfer_human: 'Transferir para humano',
  close: 'Encerrar conversa',
  none: 'Apenas finalizar fluxo',
};

export function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  return (
    <BaseNode
      title="Fim"
      icon={<CircleStop className="h-4 w-4 text-white" />}
      color="bg-red-600"
      selected={selected}
      showSourceHandle={false}
    >
      <p className="text-xs text-gray-400">
        {data?.action ? END_ACTIONS[data.action] : 'Fluxo encerrado'}
      </p>
    </BaseNode>
  );
}
