/**
 * 工作流编辑器 Context
 *
 * 集中管理工作流编辑器的共享状态，避免 prop drilling
 */

import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import { useNodesState, useEdgesState, type Node, type Edge, type ReactFlowInstance } from '@xyflow/react';
import type { ScriptConfig } from '../../../types';
import type { WorkflowMeta, PropertyPanelData } from '../config/types';
import { writeDebugLog } from '../../../services/tauri';

/**
 * WorkflowContext 值类型
 */
interface WorkflowContextValue {
  // ReactFlow 状态
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;

  // ReactFlow 实例
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: React.Dispatch<React.SetStateAction<ReactFlowInstance | null>>;

  // 选择状态
  selectedNodeId: string | null;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;

  // 属性面板
  propertyPanel: PropertyPanelData | null;
  setPropertyPanel: React.Dispatch<React.SetStateAction<PropertyPanelData | null>>;

  // 工作流元数据
  workflowMeta: WorkflowMeta;
  setWorkflowMeta: React.Dispatch<React.SetStateAction<WorkflowMeta>>;

  // 脚本配置
  scriptConfigs: ScriptConfig[];
  setScriptConfigs: React.Dispatch<React.SetStateAction<ScriptConfig[]>>;
  loadingScripts: boolean;
  setLoadingScripts: React.Dispatch<React.SetStateAction<boolean>>;

  // 操作状态
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  executing: boolean;
  setExecuting: React.Dispatch<React.SetStateAction<boolean>>;

  // 初始化标记
  isWorkflowInitialized: React.MutableRefObject<boolean>;
  hasInitialFitView: React.MutableRefObject<boolean>;

  // 工具方法
  debugLog: (tag: string, data: Record<string, unknown>) => void;

  // 初始化状态变更基础方法
  onNodesChangeBase: (changes: never) => void;
  onEdgesChangeBase: (changes: never) => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

/**
 * WorkflowProvider 属性
 */
interface WorkflowProviderProps {
  children: ReactNode;
  /** 初始工作流名称 */
  initialName?: string;
  /** 初始工作流描述 */
  initialDescription?: string;
}

/**
 * 工作流状态管理 Provider
 */
export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({
  children,
  initialName = '新建工作流',
  initialDescription = '',
}) => {
  // ReactFlow 状态
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);

  // ReactFlow 实例
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // 选择状态
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 属性面板
  const [propertyPanel, setPropertyPanel] = useState<PropertyPanelData | null>(null);

  // 工作流元数据
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({
    name: initialName,
    description: initialDescription,
  });

  // 脚本配置
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);

  // 操作状态
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  // 初始化标记
  const isWorkflowInitialized = useRef(false);
  const hasInitialFitView = useRef(false);

  // 调试日志
  const debugLog = useCallback((tag: string, data: Record<string, unknown>) => {
    writeDebugLog(tag, data).match(
      () => {},
      (err) => console.error('写入调试日志失败:', err)
    );
  }, []);

  const value: WorkflowContextValue = {
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    setReactFlowInstance,
    selectedNodeId,
    setSelectedNodeId,
    propertyPanel,
    setPropertyPanel,
    workflowMeta,
    setWorkflowMeta,
    scriptConfigs,
    setScriptConfigs,
    loadingScripts,
    setLoadingScripts,
    saving,
    setSaving,
    executing,
    setExecuting,
    isWorkflowInitialized,
    hasInitialFitView,
    debugLog,
    onNodesChangeBase,
    onEdgesChangeBase,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

/**
 * 获取工作流 Context
 *
 * 必须在 WorkflowProvider 内部使用
 */
export const useWorkflow = (): WorkflowContextValue => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

/**
 * 导出类型
 */
export type { WorkflowContextValue };
