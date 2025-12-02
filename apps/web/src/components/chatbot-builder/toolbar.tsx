'use client';

import { cn } from '@/lib/utils';
import { CircleStop, Clock, GitBranch, GripVertical, MessageSquare, Play, Zap } from 'lucide-react';
import type { DragEvent } from 'react';

interface NodeTypeItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const NODE_TYPES: NodeTypeItem[] = [
  {
    type: 'start',
    label: 'Início',
    icon: <Play className="h-4 w-4" />,
    color: 'bg-green-600',
    description: 'Ponto de entrada do fluxo',
  },
  {
    type: 'message',
    label: 'Mensagem',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-blue-600',
    description: 'Enviar mensagem de texto',
  },
  {
    type: 'condition',
    label: 'Condição',
    icon: <GitBranch className="h-4 w-4" />,
    color: 'bg-yellow-600',
    description: 'Criar ramificação condicional',
  },
  {
    type: 'action',
    label: 'Ação',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-purple-600',
    description: 'Executar uma ação',
  },
  {
    type: 'delay',
    label: 'Aguardar',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-orange-600',
    description: 'Pausar o fluxo',
  },
  {
    type: 'end',
    label: 'Fim',
    icon: <CircleStop className="h-4 w-4" />,
    color: 'bg-red-600',
    description: 'Finalizar o fluxo',
  },
];

export function ChatbotToolbar() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 overflow-y-auto">
      <h3 className="font-semibold text-white mb-4">Componentes</h3>
      <p className="text-xs text-gray-500 mb-4">Arraste para o canvas para adicionar</p>

      <div className="space-y-2">
        {NODE_TYPES.map((nodeType) => (
          <div
            key={nodeType.type}
            draggable
            onDragStart={(e) => onDragStart(e, nodeType.type)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border border-gray-700',
              'bg-gray-800 cursor-grab hover:border-gray-600 transition',
              'active:cursor-grabbing',
            )}
          >
            <GripVertical className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center text-white',
                nodeType.color,
              )}
            >
              {nodeType.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{nodeType.label}</p>
              <p className="text-xs text-gray-500 truncate">{nodeType.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
