/**
 * 节点相关工具函数
 */

import type { Node } from '@xyflow/react';
import type { WorkflowNode, ParamSource, ScriptConfig } from '../../../types';
import type { ScriptNodeData } from './types';

/**
 * 生成唯一 ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 将工作流节点转换为 ReactFlow 节点
 */
export const workflowNodeToReactFlowNode = (
  node: WorkflowNode,
  _inputSchema?: unknown,
  outputSchema?: { name: string; label: string }[],
  scriptConfigs?: ScriptConfig[],
): Node => {
  const baseData = {
    scriptId: node.scriptId,
    paramsConfig: node.paramsConfig,
  };

  const position = Array.isArray(node.position)
    ? { x: node.position[0], y: node.position[1] }
    : node.position;

  if (node.nodeType === 'input') {
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: '工作流输入',
        inputSchema: [],
      },
    };
  }

  if (node.nodeType === 'output') {
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: '工作流输出',
        outputSchema: outputSchema || [],
      },
    };
  }

  if (node.nodeType === 'script' && node.scriptId && scriptConfigs) {
    const scriptConfig = scriptConfigs.find((s) => s.id === node.scriptId);
    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        ...baseData,
        name: scriptConfig?.name || node.scriptId,
        description: scriptConfig?.description,
        paramsSchema: scriptConfig?.params || [],
        outputSchema: scriptConfig?.outputs || [],
      },
    };
  }

  return {
    id: node.id,
    type: node.nodeType,
    position,
    data: {
      ...baseData,
      name: node.scriptId || '未知脚本',
      paramsSchema: [],
      outputSchema: [],
    },
  };
};

/**
 * 构建工作流节点数据
 */
export const buildWorkflowNodes = (nodes: Node[]): WorkflowNode[] => {
  return nodes.map((node) => ({
    id: node.id,
    nodeType: (node.type === 'workflowOutput' ? 'output' : node.type) as 'script' | 'input' | 'output',
    scriptId: (node.data as ScriptNodeData).scriptId,
    position: node.position,
    paramsConfig: ((node.data as ScriptNodeData).paramsConfig || {}) as Record<string, ParamSource>,
  }));
};

/**
 * 清理节点中引用已删除边的 paramsConfig
 */
export const cleanupNodeParamsConfig = (
  nodes: Node[],
  targetNodeId: string,
  sourceNodeId: string,
  paramName: string,
): Node[] => {
  return nodes.map((node) => {
    if (node.id !== targetNodeId) return node;

    const nodeData = node.data as ScriptNodeData;
    const paramsConfig = nodeData.paramsConfig || {};
    const paramSource = paramsConfig[paramName] as ParamSource | undefined;

    if (paramSource?.type === 'fromNodeOutput' && paramSource.nodeId === sourceNodeId) {
      const { [paramName]: _, ...rest } = paramsConfig;
      return { ...node, data: { ...nodeData, paramsConfig: rest } };
    }
    return node;
  });
};

/**
 * 更新节点的 paramsConfig
 */
export const updateNodeParamsConfig = (
  nodes: Node[],
  nodeId: string,
  paramName: string,
  paramSource: ParamSource,
): Node[] => {
  return nodes.map((node) => {
    if (node.id !== nodeId) return node;
    const nodeData = node.data as ScriptNodeData;
    return {
      ...node,
      data: {
        ...nodeData,
        paramsConfig: { ...(nodeData.paramsConfig || {}), [paramName]: paramSource },
      },
    };
  });
};

/**
 * 构建拖拽创建的新节点
 */
export const buildDroppedNode = (
  scriptConfigJson: string,
  position: { x: number; y: number },
): Node | null => {
  const data = JSON.parse(scriptConfigJson);
  const params = data.params || data.paramsSchema || [];
  const outputs = data.outputs || data.outputSchema || [];
  const scriptId = data.id || data.scriptId;

  return {
    id: generateId(),
    type: 'script',
    position,
    data: {
      scriptId,
      name: data.name,
      description: data.description,
      paramsSchema: params,
      outputSchema: outputs,
    },
  };
};

/**
 * 属性面板数据（内部使用类型）
 * 注意：公开的类型定义在 types.ts 中
 */
interface PropertyPanelDataInternal {
  nodeId: string;
  nodeType: 'script' | 'input' | 'workflowOutput';
  data: ScriptNodeData;
  scriptId?: string;
  paramsSchema?: ScriptConfig['params'];
}

/**
 * 构建属性面板数据
 */
export const buildPropertyPanelData = (
  node: Node,
): PropertyPanelDataInternal => {
  const nodeType = node.type as 'script' | 'input' | 'workflowOutput';
  const nodeData = node.data as ScriptNodeData;
  return {
    nodeId: node.id,
    nodeType,
    data: nodeData,
    scriptId: nodeType === 'script' ? nodeData.scriptId : undefined,
    paramsSchema: nodeType === 'script' ? nodeData.paramsSchema : undefined,
  };
};
