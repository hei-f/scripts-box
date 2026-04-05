/**
 * 工作流状态管理 Hook
 */

import { useState, useRef, useCallback, startTransition, useEffect } from 'react';
import { useNodesState, useEdgesState, type Node, type Edge, type ReactFlowInstance } from '@xyflow/react';
import type { Workflow, ScriptConfig } from '../../../types';
import type { WorkflowMeta, PropertyPanelData } from '../config/types';
import {
  workflowNodeToReactFlowNode,
  workflowEdgeToReactFlowEdge,
  generateEdgesFromParamsConfig,
} from '../config/utils';
import { writeDebugLog } from '../../../services/tauri';

interface UseWorkflowStateOptions {
  initialWorkflow?: Workflow;
  scriptConfigs: ScriptConfig[];
  loadingScripts: boolean;
}

interface UseWorkflowStateReturn {
  // ReactFlow 状态
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChangeBase: (changes: import('@xyflow/react').NodeChange[]) => void;
  onEdgesChangeBase: (changes: import('@xyflow/react').EdgeChange[]) => void;

  // 选择状态
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  propertyPanel: PropertyPanelData | null;
  setPropertyPanel: (data: PropertyPanelData | null) => void;

  // 工作流元数据
  workflowMeta: WorkflowMeta;
  setWorkflowMeta: React.Dispatch<React.SetStateAction<WorkflowMeta>>;

  // 调试日志
  debugLog: (tag: string, data: Record<string, unknown>) => void;
}

export function useWorkflowState({
  initialWorkflow,
  scriptConfigs,
  loadingScripts,
}: UseWorkflowStateOptions): UseWorkflowStateReturn {
  // ReactFlow 实例
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // 节点和边状态
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);

  // 选中的节点
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 属性面板数据
  const [propertyPanel, setPropertyPanel] = useState<PropertyPanelData | null>(null);

  // 工作流元数据
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({
    name: initialWorkflow?.name || '新建工作流',
    description: initialWorkflow?.description || '',
  });

  // 标记工作流初始化是否已完成
  const isWorkflowInitialized = useRef(false);

  // 调试日志
  const debugLog = useCallback((tag: string, data: Record<string, unknown>) => {
    console.log('[WorkflowEditor DEBUG]', tag, data);
    writeDebugLog(tag, data).match(
      () => {},
      (err) => console.error('写入调试日志失败:', err)
    );
  }, []);

  // 初始化工作流数据
  useEffect(() => {
    debugLog('initEffect:trigger', {
      isInitialized: isWorkflowInitialized.current,
      hasInitialWorkflow: !!initialWorkflow,
      loadingScripts,
      scriptConfigsCount: scriptConfigs.length,
      nodesCount: nodes.length,
    });

    if (initialWorkflow) {
      if (loadingScripts) {
        debugLog('initEffect:edit-waiting-scripts', { loadingScripts });
        return;
      }

      if (isWorkflowInitialized.current) {
        debugLog('initEffect:skip-already-initialized', {});
        return;
      }

      isWorkflowInitialized.current = true;
      debugLog('initEffect:edit-mode', {
        nodesCount: initialWorkflow.nodes.length,
        edgesCount: initialWorkflow.edges.length,
        scriptConfigsCount: scriptConfigs.length,
      });

      const rfNodes = initialWorkflow.nodes.map((node) =>
        workflowNodeToReactFlowNode(
          node,
          undefined,
          initialWorkflow.outputSchema,
          scriptConfigs,
        ),
      );

      const rfEdges = initialWorkflow.edges.length > 0
        ? initialWorkflow.edges.map(workflowEdgeToReactFlowEdge)
        : generateEdgesFromParamsConfig(initialWorkflow.nodes);

      debugLog('initEffect:edit-setNodes', {
        rfNodesCount: rfNodes.length,
        rfEdgesCount: rfEdges.length,
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
      setWorkflowMeta({
        name: initialWorkflow.name,
        description: initialWorkflow.description || '',
      });
    } else {
      if (isWorkflowInitialized.current) {
        debugLog('initEffect:skip-new-already-initialized', {});
        return;
      }

      isWorkflowInitialized.current = true;
      debugLog('initEffect:new-mode', {});

      const defaultNodes: Node[] = [
        {
          id: 'output-node',
          type: 'output',
          position: { x: 800, y: 200 },
          data: {
            name: '工作流输出',
            outputSchema: [],
          },
        },
      ];

      startTransition(() => {
        setNodes(defaultNodes);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkflow, loadingScripts, scriptConfigs, setNodes, setEdges]);

  return {
    reactFlowInstance,
    setReactFlowInstance,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChangeBase,
    onEdgesChangeBase,
    selectedNodeId,
    setSelectedNodeId,
    propertyPanel,
    setPropertyPanel,
    workflowMeta,
    setWorkflowMeta,
    debugLog,
  };
}
