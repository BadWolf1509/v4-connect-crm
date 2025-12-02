'use client';

import { MessageSquare } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

interface MessageNodeData {
  text?: string;
  mediaUrl?: string;
  delay?: number;
}

export function MessageNode({ data, selected }: NodeProps<MessageNodeData>) {
  return (
    <BaseNode
      title="Mensagem"
      icon={<MessageSquare className="h-4 w-4 text-white" />}
      color="bg-blue-600"
      selected={selected}
    >
      <div className="space-y-2">
        <p className="text-sm text-white line-clamp-3">
          {data?.text || 'Clique para editar a mensagem...'}
        </p>
        {data?.delay && <p className="text-xs text-gray-500">Delay: {data.delay}s</p>}
      </div>
    </BaseNode>
  );
}
