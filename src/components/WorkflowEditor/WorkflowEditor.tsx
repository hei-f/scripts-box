/**
 * 工作流编辑器主组件
 *
 * 提供可视化工作流编辑功能，包含：
 * - ReactFlow 画布：用于拖拽、连接节点
 * - 节点面板：可拖拽的脚本列表
 * - 工具栏：保存、执行、撤销、重做等操作
 * - 属性面板：选中节点时显示详细配置
 */

import React, { useState, startTransition, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Layout, message, theme } from 'antd';

import type { ScriptConfig } from '../../types';
import { debugLog } from '../../services/debugLog';
import { nodeTypes } from './config/constants';
import {
  isValidConnection,
  executeWorkflowAction,
  undoAction,
  redoAction,
  saveWorkflowAction,
  getEdgeDeletionInfo,
  cleanupNodeParamsConfig,
  createConnectionParamSource,
  updateNodeParamsConfig,
  buildParamSource,
  buildDroppedNode,
  buildPropertyPanelData,
} from './config/utils';
import type { WorkflowMeta, PropertyPanelData, WorkflowEditorProps, ScriptNodeData, OutputNodeData } from './config/types';

// Hooks
import { useLoadScripts, useWorkflowInit } from './hooks';

// 子组件
import NodePanel from './components/panels/NodePanel';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/panels/PropertyPanel';

const { Sider, Content } = Layout;

/**
 * 工作流编辑器组件
 */
const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  initialWorkflow,
  onSave,
  onExecute,
  onCancel,
}) => {
  const { token } = theme.useToken();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ==================== 状态管理 ====================

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [propertyPanel, setPropertyPanel] = useState<PropertyPanelData | null>(null);
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({
    name: initialWorkflow?.name || '新建工作流',
    description: initialWorkflow?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  // 历史记录（用于撤销/重做）
  // 注意：完整实现需要记录每次操作的历史状态

  // ==================== Hooks ====================

  // 加载脚本列表
  const { scriptConfigs, loading: loadingScripts } = useLoadScripts();

  // 初始化工作流数据
  useWorkflowInit({
    initialWorkflow,
    scriptConfigs,
    loadingScripts,
    reactFlowInstance,
    nodes,
    setNodes,
    setEdges,
    setWorkflowMeta,
  });

  // ==================== 事件处理 ====================

  /**
   * 处理节点变化（包装为 startTransition）
   */
  const onNodesChange = (changes: NodeChange[]) => {
    startTransition(() => onNodesChangeBase(changes));
  };

  /**
   * 处理边变化
   *
   * 当边被删除时，检查是否有节点的 paramsConfig 引用了该连接，
   * 如果有则清理对应的 FromNodeOutput 配置。
   */
  const onEdgesChange = (changes: EdgeChange[]) => {
    startTransition(() => {
      changes.forEach((change) => {
        if (change.type !== 'remove') return;

        const deletedEdge = edges.find((edge) => edge.id === change.id);
        if (!deletedEdge) return;

        const info = getEdgeDeletionInfo(deletedEdge);
        if (!info) return;

        setNodes((nds) => cleanupNodeParamsConfig(nds, info.target, info.source, info.paramName));
      });
      onEdgesChangeBase(changes);
    });
  };

  /**
   * 处理节点选择
   */
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    startTransition(() => {
      setSelectedNodeId(node.id);
      setPropertyPanel(buildPropertyPanelData(node));
    });
  };

  /**
   * 处理画布点击（取消选择）
   */
  const onPaneClick = () => {
    startTransition(() => {
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });
  };

  /**
   * 处理连接创建
   *
   * 当连接成功时，自动更新目标节点的 paramsConfig：
   * 1. 解析 targetHandle 获取参数名（格式：input-{paramName}）
   * 2. 解析 sourceHandle 获取输出字段名（格式：output-{outputName}）
   * 3. 设置对应的 FromNodeOutput 来源
   */
  const onConnect = (connection: Connection) => {
    if (!isValidConnection(connection, edges)) {
      message.warning('无效的连接：不允许自连接或重复连接');
      return;
    }

    startTransition(() => {
      setEdges((eds) => addEdge(connection, eds));

      const result = createConnectionParamSource(connection);
      if (result && connection.target) {
        setNodes((nds) => updateNodeParamsConfig(nds, connection.target!, result.paramName, result.paramSource));
      }
    });
  };

  /**
   * 处理拖拽经过
   */
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  /**
   * 处理拖拽放置
   */
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowInstance || !reactFlowWrapper.current) return;

    const scriptConfigJson = event.dataTransfer.getData('application/json');
    if (!scriptConfigJson) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const newNode = buildDroppedNode(scriptConfigJson, position);
    if (newNode) {
      startTransition(() => setNodes((nds) => [...nds, newNode]));
    }
  };

  /**
   * 处理脚本拖拽开始
   */
  const onScriptDragStart = (event: React.DragEvent, scriptConfig: ScriptConfig) => {
    event.dataTransfer.setData('application/json', JSON.stringify(scriptConfig));
    event.dataTransfer.effectAllowed = 'move';
  };

  /**
   * 删除选中节点
   */
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;

    startTransition(() => {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
      setPropertyPanel(null);
    });
    message.success('节点已删除');
  };

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
  const handleParamConfigUpdate = (
    paramName: string,
    sourceType: string,
    value?: unknown,
    inputParamName?: string,
    sourceNodeId?: string,
    outputField?: string,
  ) => {
    if (!propertyPanel || propertyPanel.nodeType !== 'script') return;

    const newParamSource = buildParamSource(sourceType, value, inputParamName, sourceNodeId, outputField);
    if (!newParamSource) return;

    const nodeId = propertyPanel.nodeId;

    startTransition(() => {
      setNodes((nds) => updateNodeParamsConfig(nds, nodeId, paramName, newParamSource));

      setPropertyPanel((prev: PropertyPanelData | null) => {
        if (!prev || prev.nodeType !== 'script') return prev;
        const prevData = prev.data as ScriptNodeData;
        return {
          ...prev,
          data: { ...prevData, paramsConfig: { ...(prevData.paramsConfig || {}), [paramName]: newParamSource } },
        };
      });
    });

    message.success(`参数 "${paramName}" 配置已更新`);
  };

  /**
   * 处理输出节点数据更新
   */
  const handleOutputNodeDataUpdate = (newData: unknown) => {
    if (!propertyPanel || propertyPanel.nodeType !== 'workflowOutput') return;

    const nodeId = propertyPanel.nodeId;

    startTransition(() => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;
          return { ...node, data: newData as Record<string, unknown> };
        })
      );

      setPropertyPanel((prev: PropertyPanelData | null) => {
        if (!prev || prev.nodeType !== 'workflowOutput') return prev;
        return { ...prev, data: newData as OutputNodeData | ScriptNodeData };
      });
    });
  };

  // ==================== 工作流操作 ====================

  /**
   * 保存工作流
   */
  const handleSave = async () => {
    setSaving(true);

    const result = await saveWorkflowAction({
      nodes,
      edges,
      workflowMeta,
      existingWorkflowId: initialWorkflow?.id,
      scriptConfigs,
      onSave,
      debugLog,
    });

    if (result.success) {
      message.success('工作流保存成功');
    } else {
      message.error(result.error || '保存失败');
    }

    setSaving(false);
  };

  /**
   * 执行工作流
   */
  const handleExecute = async () => {
    setExecuting(true);

    const result = await executeWorkflowAction({
      workflowId: initialWorkflow?.id,
      onExecute,
      debugLog,
    });

    if (result.success) {
      message.success('工作流执行成功');
    } else {
      message.error(result.error || '执行失败');
    }

    setExecuting(false);
  };

  /**
   * 撤销
   */
  const handleUndo = () => {
    undoAction();
    message.info('撤销功能开发中');
  };

  /**
   * 重做
   */
  const handleRedo = () => {
    redoAction();
    message.info('重做功能开发中');
  };

  // ==================== 渲染 ====================

  return (
    <Layout style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 左侧节点面板 */}
      <Sider
        width={220}
        theme="light"
        style={{ borderRight: `1px solid ${token.colorBorder}`, overflow: 'hidden' }}
      >
        <NodePanel
          scriptConfigs={scriptConfigs}
          loading={loadingScripts}
          onDragStart={onScriptDragStart}
        />
      </Sider>

      {/* 中间画布区域 */}
      <Content style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <Toolbar
          workflowName={workflowMeta.name}
          workflowId={initialWorkflow?.id}
          saving={saving}
          executing={executing}
          onNameChange={(name) => startTransition(() => setWorkflowMeta((prev: WorkflowMeta) => ({ ...prev, name })))}
          onSave={handleSave}
          onExecute={handleExecute}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCancel={onCancel}
        />

        {/* ReactFlow 画布 */}
        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative', minHeight: 0, width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={(connection) => isValidConnection(connection as Connection, edges)}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            snapToGrid
            snapGrid={[15, 15]}
            connectionLineStyle={{ stroke: token.colorPrimary, strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'input') return token.colorSuccess;
                if (node.type === 'workflowOutput') return token.colorWarning;
                return token.colorPrimary;
              }}
              style={{ background: token.colorBgContainer }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </Content>

      {/* 右侧属性面板 */}
      <Sider
        width={300}
        theme="light"
        style={{ borderLeft: `1px solid ${token.colorBorder}`, overflow: 'auto' }}
      >
        <div style={{ height: '100%', overflow: 'auto' }}>
          <PropertyPanel
            propertyPanel={propertyPanel}
            nodes={nodes}
            onParamConfigUpdate={handleParamConfigUpdate}
            onOutputNodeDataUpdate={handleOutputNodeDataUpdate}
            onDelete={handleDeleteSelected}
          />
        </div>
      </Sider>
    </Layout>
  );
};

const WorkflowEditorWrapper: React.FC<WorkflowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowEditorWrapper;
