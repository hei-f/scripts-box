/**
 * 参数配置 Hook
 *
 * 封装参数配置相关逻辑，包括：
 * - 更新节点参数配置
 * - 更新输出节点数据
 */

import { useCallback, startTransition } from 'react';
import { message } from 'antd';
import type { ParamSource } from '../../../types';
import type {
  ScriptNodeData,
  InputNodeData,
  OutputNodeData,
  PropertyPanelData,
} from '../config/types';
import { PARAM_SOURCE_TYPE } from '../config/constants';
import type { Node } from '@xyflow/react';

interface UseParamConfigOptions {
  /** 设置节点列表 */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** 属性面板数据 */
  propertyPanel: PropertyPanelData | null;
  /** 设置属性面板数据 */
  setPropertyPanel: React.Dispatch<React.SetStateAction<PropertyPanelData | null>>;
}

interface UseParamConfigReturn {
  /**
   * 处理参数配置更新
   *
   * @param paramName - 参数名
   * @param sourceType - 参数来源类型
   * @param value - 静态值（当 sourceType 为 'static' 时）
   * @param inputParamName - 工作流输入参数名（当 sourceType 为 'fromInput' 时）
   * @param sourceNodeId - 来源节点 ID（当 sourceType 为 'fromNodeOutput' 时）
   * @param outputField - 输出字段名（当 sourceType 为 'fromNodeOutput' 时）
   */
  handleParamConfigUpdate: (
    paramName: string,
    sourceType: string,
    value?: unknown,
    inputParamName?: string,
    sourceNodeId?: string,
    outputField?: string,
  ) => void;
  /**
   * 处理输出节点数据更新
   */
  handleOutputNodeDataUpdate: (newData: OutputNodeData | ScriptNodeData | InputNodeData) => void;
}

/**
 * 参数配置 Hook
 */
export function useParamConfig({
  setNodes,
  propertyPanel,
  setPropertyPanel,
}: UseParamConfigOptions): UseParamConfigReturn {
  /**
   * 处理参数配置更新
   *
   * @param paramName - 参数名
   * @param sourceType - 参数来源类型
   * @param value - 静态值（当 sourceType 为 'static' 时）
   * @param inputParamName - 工作流输入参数名（当 sourceType 为 'fromInput' 时）
   * @param sourceNodeId - 来源节点 ID（当 sourceType 为 'fromNodeOutput' 时）
   * @param outputField - 输出字段名（当 sourceType 为 'fromNodeOutput' 时）
   */
  const handleParamConfigUpdate = useCallback(
    (
      paramName: string,
      sourceType: string,
      value?: unknown,
      inputParamName?: string,
      sourceNodeId?: string,
      outputField?: string,
    ) => {
      if (!propertyPanel || propertyPanel.nodeType !== 'script') {
        return;
      }

      const nodeId = propertyPanel.nodeId;
      let newParamSource: ParamSource;

      // 根据来源类型创建参数来源配置
      switch (sourceType) {
        case PARAM_SOURCE_TYPE.STATIC:
          newParamSource = { type: 'static', value };
          break;
        case PARAM_SOURCE_TYPE.FROM_INPUT:
          newParamSource = { type: 'fromInput', paramName: inputParamName || paramName };
          break;
        case PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT:
          newParamSource = {
            type: 'fromNodeOutput',
            nodeId: sourceNodeId || '',
            outputField: outputField || '',
          };
          break;
        default:
          return;
      }

      startTransition(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }

            const nodeData = node.data as ScriptNodeData;
            const updatedParamsConfig = {
              ...(nodeData.paramsConfig || {}),
              [paramName]: newParamSource,
            };

            return {
              ...node,
              data: {
                ...nodeData,
                paramsConfig: updatedParamsConfig,
              },
            };
          })
        );

        // 更新属性面板数据
        setPropertyPanel((prev) => {
          if (!prev || prev.nodeType !== 'script') {
            return prev;
          }

          const prevData = prev.data as ScriptNodeData;
          const updatedParamsConfig = {
            ...(prevData.paramsConfig || {}),
            [paramName]: newParamSource,
          };

          return {
            ...prev,
            data: {
              ...prevData,
              paramsConfig: updatedParamsConfig,
            },
          };
        });
      });

      message.success(`参数 "${paramName}" 配置已更新`);
    },
    [propertyPanel, setNodes, setPropertyPanel]
  );

  /**
   * 处理输出节点数据更新
   */
  const handleOutputNodeDataUpdate = useCallback(
    (newData: OutputNodeData | ScriptNodeData | InputNodeData) => {
      if (!propertyPanel || propertyPanel.nodeType !== 'workflowOutput') {
        return;
      }

      const nodeId = propertyPanel.nodeId;

      startTransition(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }
            return {
              ...node,
              data: newData as Record<string, unknown>,
            };
          })
        );

        setPropertyPanel((prev) => {
          if (!prev || prev.nodeType !== 'workflowOutput') {
            return prev;
          }
          return {
            ...prev,
            data: newData,
          };
        });
      });
    },
    [propertyPanel, setNodes, setPropertyPanel]
  );

  return {
    handleParamConfigUpdate,
    handleOutputNodeDataUpdate,
  };
}
