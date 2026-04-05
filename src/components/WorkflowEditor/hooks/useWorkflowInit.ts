/**
 * 工作流初始化 Hook
 *
 * 负责初始化工作流数据，包括编辑模式和新建模式的节点初始化，
 * 以及 fitView 视图适配
 */

import { useEffect, useRef } from 'react';
import { startTransition } from 'react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';

import type { Workflow, ScriptConfig } from '../../../types';
import { writeDebugLog } from '../../../services/tauri';
import {
  workflowNodeToReactFlowNode,
  workflowEdgeToReactFlowEdge,
  generateEdgesFromParamsConfig,
} from '../config/utils';
import type { WorkflowMeta, ScriptNodeData } from '../config/types';

/** 调试日志 */
const debugLog = (tag: string, data: Record<string, unknown>) => {
  writeDebugLog(tag, data).match(
    () => {},
    (err) => console.error('写入调试日志失败:', err)
  );
};

/** useWorkflowInit 参数 */
export interface UseWorkflowInitParams {
  /** 初始工作流数据（编辑模式） */
  initialWorkflow: Workflow | undefined;
  /** 脚本配置列表 */
  scriptConfigs: ScriptConfig[];
  /** 是否正在加载脚本 */
  loadingScripts: boolean;
  /** ReactFlow 实例 */
  reactFlowInstance: ReactFlowInstance | null;
  /** 节点列表 */
  nodes: Node[];
  /** 设置节点 */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** 设置边 */
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  /** 设置工作流元数据 */
  setWorkflowMeta: React.Dispatch<React.SetStateAction<WorkflowMeta>>;
}

/** useWorkflowInit 返回值 */
export interface UseWorkflowInitResult {
  /** fitView 是否已执行的 ref */
  hasInitialFitView: React.MutableRefObject<boolean>;
}

/**
 * 工作流初始化 Hook
 *
 * 处理工作流的初始化逻辑：
 * - 编辑模式：等待脚本加载完成后初始化节点
 * - 新建模式：添加默认输出节点
 * - fitView 视图适配
 */
export function useWorkflowInit(params: UseWorkflowInitParams): UseWorkflowInitResult {
  const {
    initialWorkflow,
    scriptConfigs,
    loadingScripts,
    reactFlowInstance,
    nodes,
    setNodes,
    setEdges,
    setWorkflowMeta,
  } = params;

  const isWorkflowInitialized = useRef(false);
  const hasInitialFitView = useRef(false);

  // 初始化工作流数据
  useEffect(() => {
    debugLog('initEffect:trigger', {
      isInitialized: isWorkflowInitialized.current,
      hasInitialWorkflow: !!initialWorkflow,
      loadingScripts,
      scriptConfigsCount: scriptConfigs.length,
    });

    if (initialWorkflow) {
      // 编辑模式：等待脚本列表加载完成后再初始化节点
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

      const rfNodes = initialWorkflow.nodes.map((node) => {
        if (node.nodeType === 'script') {
          const matchedConfig = scriptConfigs.find((s) => s.id === node.scriptId);
          debugLog('workflowNodeToReactFlowNode:script-node', {
            nodeId: node.id,
            scriptId: node.scriptId,
            hasMatchedConfig: !!matchedConfig,
            matchedConfigName: matchedConfig?.name,
            paramsSchemaLength: matchedConfig?.params?.length ?? 0,
            outputSchemaLength: matchedConfig?.outputs?.length ?? 0,
            paramsSchema: matchedConfig?.params,
            outputSchema: matchedConfig?.outputs,
            warning: !matchedConfig ? `未找到 scriptId=${node.scriptId} 对应的脚本配置` : undefined,
          });
        }
        return workflowNodeToReactFlowNode(
          node,
          initialWorkflow.inputSchema,
          initialWorkflow.outputSchema,
          scriptConfigs,
        );
      });

      // 优先使用 edges 数据，如果为空则从 paramsConfig 生成
      const rfEdges = initialWorkflow.edges.length > 0
        ? initialWorkflow.edges.map(workflowEdgeToReactFlowEdge)
        : generateEdgesFromParamsConfig(initialWorkflow.nodes);

      debugLog('initEffect:edit-setNodes', {
        rfNodesCount: rfNodes.length,
        rfEdgesCount: rfEdges.length,
        nodePositions: rfNodes.map(n => ({ id: n.id, position: n.position })),
        rfNodesData: rfNodes.map(n => ({
          id: n.id,
          paramsSchema: (n.data as ScriptNodeData)?.paramsSchema?.length,
          outputSchema: (n.data as ScriptNodeData)?.outputSchema?.length,
        })),
      });

      // 同步设置节点和边，确保 fitView 时 DOM 已渲染
      setNodes(rfNodes);
      setEdges(rfEdges);
      setWorkflowMeta({
        name: initialWorkflow.name,
        description: initialWorkflow.description || '',
      });
    } else {
      // 新建模式
      // 防止重复初始化
      if (isWorkflowInitialized.current) {
        debugLog('initEffect:skip-new-already-initialized', {});
        return;
      }

      isWorkflowInitialized.current = true;
      debugLog('initEffect:new-mode', {});

      // 新建工作流时，仅添加默认的输出节点（不再需要显式的 Input 节点）
      const defaultNodes = [
        {
          id: 'output-node',
          type: 'workflowOutput' as const,
          position: { x: 800, y: 200 },
          data: { name: '工作流输出', outputSchema: [] },
        },
      ];
      startTransition(() => setNodes(defaultNodes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkflow, loadingScripts, scriptConfigs]);

  // 当 reactFlowInstance 初始化完成且节点首次加载完成时，执行一次 fitView 适配视图
  useEffect(() => {
    debugLog('fitViewEffect:trigger', {
      hasInstance: !!reactFlowInstance,
      nodesLength: nodes.length,
      hasInitialFitView: hasInitialFitView.current,
      viewport: reactFlowInstance?.getViewport?.(),
    });

    if (reactFlowInstance && nodes.length > 0 && !hasInitialFitView.current) {
      hasInitialFitView.current = true;
      debugLog('fitViewEffect:executing', { viewport: reactFlowInstance.getViewport() });
      // 使用 setTimeout 给 DOM 充裕的渲染时间，确保节点已完成布局
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
        debugLog('fitViewEffect:after-fitView', { viewport: reactFlowInstance.getViewport() });
      }, 50);
    }
  }, [reactFlowInstance, nodes.length]);

  return { hasInitialFitView };
}
