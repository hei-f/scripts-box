/**
 * 工作流编辑器类型定义
 */

import type { Node, Edge } from '@xyflow/react';
import type { ParamDefinition, ParamSource, ScriptConfig, Workflow, WorkflowNode, WorkflowEdge, OutputDefinition } from '../../../types';

/**
 * 工作流元数据
 */
export interface WorkflowMeta {
  name: string;
  description: string;
}

/**
 * 属性面板数据
 */
export interface PropertyPanelData {
  nodeId: string;
  nodeType: 'script' | 'input' | 'workflowOutput';
  data: ScriptNodeData | InputNodeData | OutputNodeData;
  /** 脚本 ID（仅 Script 节点有） */
  scriptId?: string;
  /** 参数定义列表（仅 Script 节点有） */
  paramsSchema?: ParamDefinition[];
}

/**
 * Script 节点数据
 */
export interface ScriptNodeData {
  scriptId?: string;
  name?: string;
  description?: string;
  paramsSchema?: ParamDefinition[];
  outputSchema?: OutputDefinition[];
  paramsConfig?: Record<string, ParamSource>;
}

/**
 * Input 节点数据
 */
export interface InputNodeData {
  name: string;
  inputSchema: ParamDefinition[];
  paramsConfig?: Record<string, ParamSource>;
}

/**
 * Output 节点数据
 */
export interface OutputNodeData {
  name: string;
  outputSchema: OutputDefinition[];
  paramsConfig?: Record<string, ParamSource>;
}

/**
 * WorkflowEditor 组件属性
 */
export interface WorkflowEditorProps {
  /** 初始工作流数据（编辑模式） */
  initialWorkflow?: Workflow;
  /** 保存成功回调 */
  onSave?: (workflow: Workflow) => void;
  /** 执行成功回调 */
  onExecute?: (result: unknown) => void;
  /** 取消编辑回调 */
  onCancel?: () => void;
}

// 重导出外部类型
export type { Node, Edge, ParamDefinition, ParamSource, ScriptConfig, Workflow, WorkflowNode, WorkflowEdge };
