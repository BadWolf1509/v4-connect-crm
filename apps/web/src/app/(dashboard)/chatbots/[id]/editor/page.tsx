'use client';

import { FlowCanvas } from '@/components/chatbot-builder/flow-canvas';
import { ChatbotToolbar } from '@/components/chatbot-builder/toolbar';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { Edge, Node } from 'reactflow';
import { toast } from 'sonner';

interface FlowNode {
  id: string;
  type: string;
  name?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  condition?: Record<string, unknown>;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export default function ChatbotEditorPage() {
  const params = useParams();
  const chatbotId = params.id as string;
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch chatbot data
  const { data: chatbot, isLoading } = useQuery({
    queryKey: ['chatbot', chatbotId],
    queryFn: () => api.get<Chatbot>(`/chatbots/${chatbotId}`),
  });

  // Add node mutation
  const addNodeMutation = useMutation({
    mutationFn: (data: { type: string; position: { x: number; y: number } }) =>
      api.post(`/chatbots/${chatbotId}/nodes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot', chatbotId] });
    },
  });

  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: ({
      nodeId,
      data,
    }: {
      nodeId: string;
      data: Record<string, unknown>;
    }) => api.patch(`/chatbots/${chatbotId}/nodes/${nodeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot', chatbotId] });
    },
  });

  // Add edge mutation
  const addEdgeMutation = useMutation({
    mutationFn: (data: { sourceId: string; targetId: string }) =>
      api.post(`/chatbots/${chatbotId}/edges`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot', chatbotId] });
    },
  });

  // Convert API data to ReactFlow format
  const initialNodes: Node[] = (chatbot?.nodes || []).map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.config,
  }));

  const initialEdges: Edge[] = (chatbot?.edges || []).map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label,
    type: 'smoothstep',
    animated: true,
  }));

  const handleNodeAdd = useCallback(
    (node: Node) => {
      addNodeMutation.mutate({
        type: node.type || 'message',
        position: node.position,
      });
      setHasChanges(true);
    },
    [addNodeMutation],
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      updateNodeMutation.mutate({ nodeId, data });
      setHasChanges(true);
    },
    [updateNodeMutation],
  );

  const handleEdgeAdd = useCallback(
    (edge: Edge) => {
      addEdgeMutation.mutate({
        sourceId: edge.source,
        targetId: edge.target,
      });
      setHasChanges(true);
    },
    [addEdgeMutation],
  );

  const handleSave = () => {
    toast.success('Alterações salvas automaticamente');
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-400 mb-4">Chatbot não encontrado</p>
        <Link href="/chatbots" className="text-v4-red-500 hover:text-v4-red-400">
          Voltar para lista
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/chatbots"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">{chatbot.name}</h1>
            <p className="text-xs text-gray-400">{chatbot.description || 'Editor de fluxo'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-xs text-yellow-400">Alterações não salvas</span>}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600"
          >
            <Save className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        <ChatbotToolbar />
        <FlowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onNodeAdd={handleNodeAdd}
          onNodeUpdate={handleNodeUpdate}
          onEdgeAdd={handleEdgeAdd}
        />
      </div>
    </div>
  );
}
