/**
 * 节点事件处理 Hook
 *
 * 封装节点相关的事件处理逻辑，包括：
 * - 节点变化处理
 * - 节点选择处理
 * - 画布点击处理
 * - 拖拽事件处理
 * - 节点删除处理
 */

import { useCallback, startTransition } from 'react';
import type {
  Node,
  Edge,
  NodeChange,
  ReactFlowInstance,
} from '@xyflow/react';
import { message } from 'antd';
import type { ScriptConfig } from '../../../types';
import type {
  ScriptNodeData,
  InputNodeData,
  OutputNodeData,
  PropertyPanelData,
} from '../config/types';
import { generateId } from '../config/utils';

/** handle 前缀：输入端口 */
const INPUT_HANDLE_PREFIX = 'input-';

/** handle 前缀：输出端口 */
const OUTPUT_HANDLE_PREFIX = 'output-';

interface UseNodeEventsOptions {
  /** ReactFlow 实例 */
  reactFlowInstance: ReactFlowInstance | null;
  /** ReactFlow 容器引用 */
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  /** 节点列表 */
  nodes: Node[];
  /** 边列表 */
  edges: Edge[];
  /** 设置节点列表 */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** 设置边列表 */
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  /** 基础节点变化处理器 */
  onNodesChangeBase: (changes: NodeChange[]) => void;
  /** 设置选中的节点 ID */
  setSelectedNodeId: (id: string | null) => void;
  /** 设置属性面板数据 */
  setPropertyPanel: (data: PropertyPanelData | null) => void;
  /** 当前选中的节点 ID */
  selectedNodeId: string | null;
}

interface UseNodeEventsReturn {
  /** 处理节点变化（包装为 startTransition） */
  onNodesChange: (changes: NodeChange[]) => void;
  /** 处理节点选择 */
  onNodeClick: (_: React.MouseEvent, node: Node) => void;
  /** 处理画布点击（取消选择） */
  onPaneClick: () => void;
  /** 处理拖拽经过 */
  onDragOver: (event: React.DragEvent) => void;
  /** 处理拖拽放置 */
  onDrop: (event: React.DragEvent) => void;
  /** 处理脚本拖拽开始 */
  onScriptDragStart: (event: React.DragEvent, scriptConfig: ScriptConfig) => void;
  /** 删除选中节点 */
  handleDeleteSelected: () => void;
}

/**
 * 节点事件处理 Hook
 */
export function useNodeEvents({
  reactFlowInstance,
  reactFlowWrapper,
  setNodes,
  setEdges,
  onNodesChangeBase,
  setSelectedNodeId,
  setPropertyPanel,
  selectedNodeId,
}: UseNodeEventsOptions): UseNodeEventsReturn {
  /**
   * 处理节点变化（包装为 startTransition）
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      startTransition(() => {
        onNodesChangeBase(changes);
      });
    },
    [onNodesChangeBase]
  );

  /**
   * 处理节点选择
   */
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      startTransition(() => {
        setSelectedNodeId(node.id);
        const nodeType = node.type as 'script' | 'input' | 'workflowOutput';
        const nodeData = node.data as ScriptNodeData | InputNodeData | OutputNodeData;

        // 设置属性面板数据，包含 Script 节点的参数信息
        setPropertyPanel({
          nodeId: node.id,
          nodeType,
          data: nodeData,
          scriptId: nodeType === 'script' ? (nodeData as ScriptNodeData).scriptId : undefined,
          paramsSchema: nodeType === 'script' ? (nodeData as ScriptNodeData).paramsSchema : undefined,
        });
      });
    },
    [setSelectedNodeId, setPropertyPanel]
  );

  /**
   * 处理画布点击（取消选择）
   */
  const onPaneClick = useCallback(() => {
    startTransition(() => {
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });
  }, [setSelectedNodeId, setPropertyPanel]);

  /**
   * 处理拖拽经过
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * 处理拖拽放置
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      // 获取拖拽的脚本配置
      const scriptConfigJson = event.dataTransfer.getData('application/json');
      if (!scriptConfigJson) {
        return;
      }

      const data = JSON.parse(scriptConfigJson);
      // 兼容两种数据格式：ScriptConfig 使用 params/outputs，ScriptDetail 使用 paramsSchema/outputSchema
      const params = data.params || data.paramsSchema || [];
      const outputs = data.outputs || data.outputSchema || [];
      const scriptId = data.id || data.scriptId;

      // 计算放置位置
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // 创建新节点
      const newNode = {
        id: generateId(),
        type: 'script' as const,
        position,
        data: {
          scriptId,
          name: data.name,
          description: data.description,
          paramsSchema: params,
          outputSchema: outputs,
        },
      };

      startTransition(() => {
        setNodes((nds) => [...nds, newNode]);
      });
    },
    [reactFlowInstance, reactFlowWrapper, setNodes]
  );

  /**
   * 处理脚本拖拽开始
   */
  const onScriptDragStart = useCallback(
    (event: React.DragEvent, scriptConfig: ScriptConfig) => {
      event.dataTransfer.setData('application/json', JSON.stringify(scriptConfig));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /**
   * 删除选中节点
   */
  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    startTransition(() => {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
      );
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });

    message.success('节点已删除');
  }, [selectedNodeId, setNodes, setEdges, setSelectedNodeId, setPropertyPanel]);

  return {
    onNodesChange,
    onNodeClick,
    onPaneClick,
    onDragOver,
    onDrop,
    onScriptDragStart,
    handleDeleteSelected,
  };
}

/** 导出常量供其他模块使用 */
export { INPUT_HANDLE_PREFIX, OUTPUT_HANDLE_PREFIX };
