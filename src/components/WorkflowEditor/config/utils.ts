/**
 * 工作流编辑器辅助函数
 */

import { MarkerType, type Node, type Edge, type Connection } from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge, ParamSource, ScriptConfig, ParamDefinition } from '../../../types';
import type { ScriptNodeData } from './types';

/**
 * 生成唯一 ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 推断工作流输入参数
 *
 * 遍历所有 Script 节点，检查每个节点的 paramsConfig 配置状态。
 * 对于未在 paramsConfig 中配置的必需参数，添加到 inputSchema 中。
 */
export const inferInputSchema = (
  nodes: Node[],
  scriptConfigs: ScriptConfig[],
): ParamDefinition[] => {
  const inputParamsMap = new Map<string, ParamDefinition>();

  nodes.forEach((node) => {
    if (node.type !== 'script') {
      return;
    }

    const nodeData = node.data as ScriptNodeData;
    const scriptId = nodeData.scriptId;
    const scriptConfig = scriptConfigs.find((config) => config.id === scriptId);
    if (!scriptConfig) {
      return;
    }

    const paramsSchema = scriptConfig.params || [];
    const paramsConfig: Record<string, ParamSource> = (nodeData.paramsConfig as Record<string, ParamSource>) || {};

    paramsSchema.forEach((param) => {
      if (!param.required) {
        return;
      }

      const isConfigured = param.name in paramsConfig;

      if (!isConfigured) {
        if (!inputParamsMap.has(param.name)) {
          inputParamsMap.set(param.name, param);
        }
      }
    });
  });

  return Array.from(inputParamsMap.values());
};

/**
 * 检查是否为有效连接
 */
export const isValidConnection = (connection: Connection, edges: Edge[]): boolean => {
  if (connection.source === connection.target) {
    return false;
  }

  const isDuplicate = edges.some(
    (edge) =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  );

  return !isDuplicate;
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
 * 将工作流边转换为 ReactFlow 边
 */
export const workflowEdgeToReactFlowEdge = (edge: WorkflowEdge): Edge => {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  };
};

/**
 * 从节点的 paramsConfig 生成边数据
 */
export const generateEdgesFromParamsConfig = (nodes: WorkflowNode[]): Edge[] => {
  const edges: Edge[] = [];

  for (const node of nodes) {
    if (!node.paramsConfig) continue;

    for (const [paramName, paramSource] of Object.entries(node.paramsConfig)) {
      if (paramSource.type === 'fromNodeOutput') {
        const source = paramSource.nodeId;
        const outputField = paramSource.outputField;
        edges.push({
          id: `edge-${source}-${outputField}-${node.id}-${paramName}`,
          source,
          target: node.id,
          sourceHandle: `output-${outputField}`,
          targetHandle: `input-${paramName}`,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    }
  }

  return edges;
};
