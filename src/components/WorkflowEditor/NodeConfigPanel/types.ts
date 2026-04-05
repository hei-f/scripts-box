/**
 * NodeConfigPanel 类型定义
 */

import type { ParamDefinition, ParamSource, SelectOption } from '../../../types';
import type { OutputDefinition } from '../../../types/workflow';
import type { ScriptNodeData } from '../components/nodes/ScriptNode';
import type { InputNodeData } from '../components/nodes/InputNode';
import type { OutputNodeData } from '../components/nodes/OutputNode';

/**
 * 节点数据联合类型
 */
export type NodeData = ScriptNodeData | InputNodeData | OutputNodeData;

/**
 * 上游节点输出信息（用于选择器）
 */
export interface UpstreamOutput {
  nodeId: string;
  nodeName: string;
  outputField: string;
  outputLabel: string;
  outputType: string;
}

/**
 * NodeConfigPanel 组件属性
 */
export interface NodeConfigPanelProps {
  /** 节点 ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: 'script' | 'input' | 'output' | 'workflowOutput';
  /** 节点数据 */
  data: NodeData;
  /** 上游节点输出列表（用于参数来源选择） */
  upstreamOutputs?: UpstreamOutput[];
  /** 工作流输入参数列表（用于参数来源选择） */
  workflowInputs?: ParamDefinition[];
  /** 配置变更回调 */
  onChange?: (data: NodeData) => void;
}

/**
 * 参数来源选择器属性
 */
export interface ParamSourceSelectorProps {
  /** 参数定义 */
  param: ParamDefinition;
  /** 当前参数来源 */
  value?: ParamSource;
  /** 上游节点输出列表 */
  upstreamOutputs?: UpstreamOutput[];
  /** 工作流输入参数列表 */
  workflowInputs?: ParamDefinition[];
  /** 值变更回调 */
  onChange?: (value: ParamSource) => void;
}

/**
 * 脚本节点配置面板属性
 */
export interface ScriptConfigPanelProps {
  data: ScriptNodeData;
  upstreamOutputs?: UpstreamOutput[];
  workflowInputs?: ParamDefinition[];
  onChange?: (data: ScriptNodeData) => void;
}

/**
 * 输入节点配置面板属性
 */
export interface InputConfigPanelProps {
  data: InputNodeData;
  onChange?: (data: InputNodeData) => void;
}

/**
 * 输出节点配置面板属性
 */
export interface OutputConfigPanelProps {
  data: OutputNodeData;
  upstreamOutputs?: UpstreamOutput[];
  onChange?: (data: OutputNodeData) => void;
}

// 重新导出依赖的类型
export type { ParamDefinition, ParamSource, SelectOption, OutputDefinition };
// 重新导出节点数据类型
export type { ScriptNodeData } from '../components/nodes/ScriptNode';
export type { InputNodeData } from '../components/nodes/InputNode';
export type { OutputNodeData } from '../components/nodes/OutputNode';
