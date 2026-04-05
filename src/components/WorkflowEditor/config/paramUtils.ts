/**
 * 参数相关工具函数
 */

import type { Node } from '@xyflow/react';
import type { ParamSource, ScriptConfig, ParamDefinition } from '../../../types';
import type { ScriptNodeData } from './types';

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
 * 构建参数源
 */
export const buildParamSource = (
  sourceType: string,
  value?: unknown,
  inputParamName?: string,
  sourceNodeId?: string,
  outputField?: string,
): ParamSource | null => {
  switch (sourceType) {
    case 'static':
      return { type: 'static', value };
    case 'fromInput':
      return { type: 'fromInput', paramName: inputParamName || '' };
    case 'fromNodeOutput':
      return { type: 'fromNodeOutput', nodeId: sourceNodeId || '', outputField: outputField || '' };
    default:
      return null;
  }
};
