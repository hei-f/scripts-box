/**
 * ReactFlow 画布展示组件
 *
 * 封装 ReactFlow 核心功能，提供：
 * - 节点和边的渲染
 * - 控制器、小地图、背景
 * - 拖拽和连接事件处理
 */

import React, { useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useReactFlow,
  Connection,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { theme } from 'antd';

import { nodeTypes as defaultNodeTypes } from '../config/constants';

/** 默认网格大小 */
const DEFAULT_SNAP_GRID: [number, number] = [15, 15];

/** 默认背景间距 */
const DEFAULT_BACKGROUND_GAP = 20;

/** 默认背景点大小 */
const DEFAULT_BACKGROUND_SIZE = 1;

/** 默认视口配置 */
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

/** 连接线样式 */
const CONNECTION_LINE_STYLE = { strokeWidth: 2 };

/** 默认边配置 */
const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
};

/**
 * Canvas 组件属性
 */
export interface CanvasProps {
  /** 节点列表 */
  nodes: Node[];
  /** 边列表 */
  edges: Edge[];
  /** 节点变化回调 */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** 边变化回调 */
  onEdgesChange?: (changes: EdgeChange[]) => void;
  /** 连接回调 */
  onConnect?: (connection: Connection) => void;
  /** 节点点击回调 */
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  /** 画布点击回调 */
  onPaneClick?: () => void;
  /** 拖拽经过回调 */
  onDragOver?: (event: React.DragEvent) => void;
  /** 拖拽放置回调 */
  onDrop?: (event: React.DragEvent) => void;
  /** ReactFlow 初始化回调 */
  onInit?: (instance: ReturnType<typeof useReactFlow>) => void;
  /** 验证连接是否有效 */
  isValidConnection?: IsValidConnection<Edge>;
  /** 自定义节点类型 */
  nodeTypes?: NodeTypes;
  /** 是否吸附网格 */
  snapToGrid?: boolean;
  /** 网格大小 */
  snapGrid?: [number, number];
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

/**
 * 画布内部组件
 *
 * 使用 useReactFlow 获取 ReactFlow 实例
 */
const CanvasInner: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDragOver,
  onDrop,
  onInit,
  isValidConnection,
  nodeTypes = defaultNodeTypes,
  snapToGrid = true,
  snapGrid = DEFAULT_SNAP_GRID,
  style,
  className,
}) => {
  const { token } = theme.useToken();
  const reactFlowInstance = useReactFlow();

  // 初始化时通知父组件
  React.useEffect(() => {
    if (onInit) {
      onInit(reactFlowInstance);
    }
  }, [reactFlowInstance, onInit]);

  /**
   * 处理拖拽放置
   * 将屏幕坐标转换为画布坐标
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!onDrop) {
        return;
      }

      // 创建一个自定义事件对象，包含转换后的坐标
      const bounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // 将位置信息附加到事件对象
      const customEvent = {
        ...event,
        nativeEvent: event.nativeEvent,
        position,
      };

      onDrop(customEvent as unknown as React.DragEvent);
    },
    [reactFlowInstance, onDrop]
  );

  /**
   * MiniMap 节点颜色
   */
  const getNodeColor = useCallback(
    (node: Node) => {
      if (node.type === 'input') {
        return token.colorSuccess;
      }
      if (node.type === 'workflowOutput') {
        return token.colorWarning;
      }
      return token.colorPrimary;
    },
    [token]
  );

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
      className={className}
      onDrop={handleDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultViewport={DEFAULT_VIEWPORT}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
        connectionLineStyle={{ stroke: token.colorPrimary, ...CONNECTION_LINE_STYLE }}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <MiniMap
          nodeColor={getNodeColor}
          style={{
            background: token.colorBgContainer,
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={DEFAULT_BACKGROUND_GAP}
          size={DEFAULT_BACKGROUND_SIZE}
        />
      </ReactFlow>
    </div>
  );
};

/**
 * Canvas 组件
 *
 * 封装 ReactFlow 的画布展示组件
 * 注意：需要被 ReactFlowProvider 包裹使用
 */
const Canvas: React.FC<CanvasProps> = (props) => {
  return <CanvasInner {...props} />;
};

export default Canvas;