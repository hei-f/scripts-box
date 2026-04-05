/**
 * 边相关工具函数
 */

import { MarkerType, type Edge, type Connection } from '@xyflow/react';
import type { WorkflowEdge } from '../../../types';

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
 * 构建工作流边数据
 */
export const buildWorkflowEdges = (edges: Edge[]): WorkflowEdge[] => {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || '',
    targetHandle: edge.targetHandle || '',
  }));
};

/**
 * 从节点的 paramsConfig 生成边数据
 */
export const generateEdgesFromParamsConfig = (nodes: { id: string; paramsConfig?: Record<string, { type: string; nodeId?: string; outputField?: string }> }[]): Edge[] => {
  const edges: Edge[] = [];

  for (const node of nodes) {
    if (!node.paramsConfig) continue;

    for (const [paramName, paramSource] of Object.entries(node.paramsConfig)) {
      if (paramSource.type === 'fromNodeOutput') {
        const source = paramSource.nodeId!;
        const outputField = paramSource.outputField!;
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
 * 从边删除变化中获取需要清理的信息
 */
export const getEdgeDeletionInfo = (
  edge: Edge,
): { source: string; target: string; paramName: string } | null => {
  const { source, target, targetHandle } = edge;
  if (!targetHandle || !targetHandle.startsWith('input-')) return null;
  return { source, target, paramName: targetHandle.substring(6) };
};

/**
 * 创建连接后的参数源配置
 */
export const createConnectionParamSource = (
  connection: Connection,
): { paramName: string; paramSource: { type: 'fromNodeOutput'; nodeId: string; outputField: string } } | null => {
  if (!connection.targetHandle?.startsWith('input-')) return null;

  const paramName = connection.targetHandle.substring(6);
  let outputField = '';
  if (connection.sourceHandle?.startsWith('output-')) {
    outputField = connection.sourceHandle.substring(7);
  }

  return {
    paramName,
    paramSource: {
      type: 'fromNodeOutput',
      nodeId: connection.source,
      outputField,
    },
  };
};
