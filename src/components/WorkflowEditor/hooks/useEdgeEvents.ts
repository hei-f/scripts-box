/**
 * 边事件处理 Hook
 *
 * 封装边相关的事件处理逻辑，包括：
 * - 边变化处理（删除边时清理相关 paramsConfig）
 * - 连接创建处理（自动更新 paramsConfig）
 */

import { useCallback, startTransition } from 'react';
import { addEdge, type Edge, type EdgeChange, type Connection } from '@xyflow/react';
import { message } from 'antd';
import type { ParamSource } from '../../../types';
import type { ScriptNodeData } from '../config/types';
import { isValidConnection } from '../config/utils';
import { INPUT_HANDLE_PREFIX, OUTPUT_HANDLE_PREFIX } from './useNodeEvents';

interface UseEdgeEventsOptions {
  /** 边列表 */
  edges: Edge[];
  /** 设置边列表 */
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  /** 设置节点列表 */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** 基础边变化处理器 */
  onEdgesChangeBase: (changes: EdgeChange[]) => void;
}

interface UseEdgeEventsReturn {
  /** 处理边变化 */
  onEdgesChange: (changes: EdgeChange[]) => void;
  /** 处理连接创建 */
  onConnect: (connection: Connection) => void;
}

// 由于 Node 类型来自 @xyflow/react，需要在文件级别导入
import type { Node } from '@xyflow/react';

/**
 * 边事件处理 Hook
 */
export function useEdgeEvents({
  edges,
  setEdges,
  setNodes,
  onEdgesChangeBase,
}: UseEdgeEventsOptions): UseEdgeEventsReturn {
  /**
   * 处理边变化
   *
   * 当边被删除时，检查是否有节点的 paramsConfig 引用了该连接，
   * 如果有则清理对应的 FromNodeOutput 配置。
   */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      startTransition(() => {
        // 处理边的删除，清理相关的 paramsConfig
        changes.forEach((change) => {
          // 只处理删除操作
          if (change.type !== 'remove') {
            return;
          }

          // 查找被删除的边
          const deletedEdge = edges.find((edge) => edge.id === change.id);
          if (!deletedEdge) {
            return;
          }

          const { source, target, targetHandle } = deletedEdge;

          // 解析 targetHandle 获取参数名（格式：input-{paramName}）
          if (!targetHandle || !targetHandle.startsWith(INPUT_HANDLE_PREFIX)) {
            return;
          }

          const paramName = targetHandle.substring(INPUT_HANDLE_PREFIX.length);

          // 更新目标节点，清理对应的 paramsConfig
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id !== target) {
                return node;
              }

              const nodeData = node.data as ScriptNodeData;
              const paramsConfig = nodeData.paramsConfig || {};

              // 检查该参数是否引用了被删除的边
              const paramSource = paramsConfig[paramName] as ParamSource | undefined;
              if (
                paramSource &&
                paramSource.type === 'fromNodeOutput' &&
                paramSource.nodeId === source
              ) {
                // 移除该参数的配置
                const { [paramName]: _, ...restParamsConfig } = paramsConfig;
                return {
                  ...node,
                  data: {
                    ...nodeData,
                    paramsConfig: restParamsConfig,
                  },
                };
              }

              return node;
            })
          );
        });

        // 应用边的变化
        onEdgesChangeBase(changes);
      });
    },
    [edges, onEdgesChangeBase, setNodes]
  );

  /**
   * 处理连接创建
   *
   * 当连接成功时，自动更新目标节点的 paramsConfig：
   * 1. 解析 targetHandle 获取参数名（格式：input-{paramName}）
   * 2. 解析 sourceHandle 获取输出字段名（格式：output-{outputName}）
   * 3. 设置对应的 FromNodeOutput 来源
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, edges)) {
        message.warning('无效的连接：不允许自连接或重复连接');
        return;
      }

      startTransition(() => {
        // 添加新的边
        setEdges((eds) => addEdge(connection, eds));

        // 如果目标节点是 Script 节点，自动更新 paramsConfig
        if (connection.targetHandle && connection.source) {
          // 解析 targetHandle 获取参数名（格式：input-{paramName}）
          const targetHandle = connection.targetHandle;
          if (targetHandle.startsWith(INPUT_HANDLE_PREFIX)) {
            const paramName = targetHandle.substring(INPUT_HANDLE_PREFIX.length);

            // 解析 sourceHandle 获取输出字段名（格式：output-{outputName}）
            let outputField = '';
            if (connection.sourceHandle && connection.sourceHandle.startsWith(OUTPUT_HANDLE_PREFIX)) {
              outputField = connection.sourceHandle.substring(OUTPUT_HANDLE_PREFIX.length);
            }

            // 创建 FromNodeOutput 参数来源
            const newParamSource: ParamSource = {
              type: 'fromNodeOutput',
              nodeId: connection.source,
              outputField,
            };

            // 更新目标节点的 paramsConfig
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== connection.target) {
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
          }
        }
      });
    },
    [edges, setEdges, setNodes]
  );

  return {
    onEdgesChange,
    onConnect,
  };
}
