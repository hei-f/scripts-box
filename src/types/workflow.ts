/**
 * 工作流类型定义
 *
 * 定义工作流相关的 TypeScript 类型，与后端 Rust 结构体保持一致
 */

import type { ParamDefinition } from './index';

/**
 * 节点类型
 */
export type NodeType = 'script' | 'input' | 'output';

/**
 * 输出类型
 */
export type OutputType = 'text' | 'number' | 'boolean' | 'json';

/**
 * 参数来源配置
 *
 * 定义参数值的来源类型：
 * - static: 静态值
 * - fromInput: 来自工作流输入参数
 * - fromNodeOutput: 来自其他节点的输出
 */
export type ParamSource =
  | { type: 'static'; value: unknown }
  | { type: 'fromInput'; paramName: string }
  | { type: 'fromNodeOutput'; nodeId: string; outputField: string };

/**
 * 工作流节点
 */
export interface WorkflowNode {
  /** 节点唯一标识 */
  id: string;
  /** 节点类型 */
  nodeType: NodeType;
  /** 脚本 ID（仅 script 类型节点需要） */
  scriptId?: string;
  /** 节点位置坐标 */
  position: { x: number; y: number };
  /** 参数配置（参数名 -> 参数来源） */
  paramsConfig: Record<string, ParamSource>;
}

/**
 * 工作流边（连接线）
 */
export interface WorkflowEdge {
  /** 边唯一标识 */
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 源节点的连接点 */
  sourceHandle: string;
  /** 目标节点的连接点 */
  targetHandle: string;
}

/**
 * 输出定义
 */
export interface OutputDefinition {
  /** 输出字段名称 */
  name: string;
  /** 输出字段显示标签 */
  label: string;
  /** 输出类型 */
  outputType: OutputType;
  /** 输出描述 */
  description?: string;
}

/**
 * 工作流定义
 */
export interface Workflow {
  /** 工作流唯一标识 */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 节点列表 */
  nodes: WorkflowNode[];
  /** 边列表 */
  edges: WorkflowEdge[];
  /** 输入参数定义 */
  inputSchema: ParamDefinition[];
  /** 输出定义 */
  outputSchema: OutputDefinition[];
}

/**
 * 工作流基本信息
 *
 * 用于工作流列表展示，不包含详细节点和边信息
 */
export interface WorkflowInfo {
  /** 工作流唯一标识 */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 创建时间（Unix 时间戳，毫秒） */
  createdAt: number;
  /** 更新时间（Unix 时间戳，毫秒） */
  updatedAt: number;
}

/**
 * 节点执行结果
 */
export interface NodeResult {
  /** 执行是否成功 */
  success: boolean;
  /** 输出内容（兼容旧格式） */
  output?: string;
  /** 结构化输出（新格式） */
  outputs?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 执行时长（毫秒） */
  durationMs: number;
}

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
  /** 执行是否成功 */
  success: boolean;
  /** 工作流输出 */
  outputs: Record<string, unknown>;
  /** 各节点执行结果 */
  nodeResults: Record<string, NodeResult>;
  /** 错误信息 */
  error?: string;
}