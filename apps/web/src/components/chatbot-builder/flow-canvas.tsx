'use client';

import { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ActionNode, ConditionNode, DelayNode, EndNode, MessageNode, StartNode } from './nodes';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  end: EndNode,
};

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeAdd?: (node: Node) => void;
  onNodeUpdate?: (nodeId: string, data: Record<string, unknown>) => void;
  onEdgeAdd?: (edge: Edge) => void;
  onEdgeDelete?: (edgeId: string) => void;
}

let nodeId = 0;

export function FlowCanvas({ initialNodes, initialEdges, onNodeAdd, onEdgeAdd }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeHandler] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeHandler] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
      };
      setEdges((eds) => addEdge(newEdge, eds));
      onEdgeAdd?.(newEdge as Edge);
    },
    [setEdges, onEdgeAdd],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowWrapper.current || !reactFlowInstance.current) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${nodeId++}`,
        type,
        position,
        data: {},
      };

      setNodes((nds) => nds.concat(newNode));
      onNodeAdd?.(newNode);
    },
    [setNodes, onNodeAdd],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6b7280', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={16} />
        <Controls className="!bg-gray-800 !border-gray-700 !shadow-lg" showInteractive={false} />
        <MiniMap
          className="!bg-gray-800 !border-gray-700"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#16a34a';
              case 'message':
                return '#2563eb';
              case 'condition':
                return '#ca8a04';
              case 'action':
                return '#9333ea';
              case 'delay':
                return '#ea580c';
              case 'end':
                return '#dc2626';
              default:
                return '#6b7280';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
