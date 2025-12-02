'use client';

import { Zap } from 'lucide-react';
import type { NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

interface ActionNodeData {
  actionType?: 'tag' | 'transfer' | 'assign' | 'webhook';
  params?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  tag: 'Adicionar Tag',
  transfer: 'Transferir Atendimento',
  assign: 'Atribuir Responsável',
  webhook: 'Chamar Webhook',
};

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  return (
    <BaseNode
      title="Ação"
      icon={<Zap className="h-4 w-4 text-white" />}
      color="bg-purple-600"
      selected={selected}
    >
      <div className="space-y-1">
        <p className="text-sm text-white">
          {data?.actionType
            ? ACTION_LABELS[data.actionType] || data.actionType
            : 'Selecione uma ação...'}
        </p>
        {data?.params && Object.keys(data.params).length > 0 && (
          <p className="text-xs text-gray-400">{JSON.stringify(data.params)}</p>
        )}
      </div>
    </BaseNode>
  );
}
