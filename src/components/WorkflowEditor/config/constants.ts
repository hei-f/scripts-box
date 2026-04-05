/**
 * 工作流编辑器常量定义
 */

import { type NodeTypes } from '@xyflow/react';
import ScriptNode from '../components/nodes/ScriptNode';
import InputNode from '../components/nodes/InputNode';
import OutputNode from '../components/nodes/OutputNode';

/** 参数来源类型常量 */
export const PARAM_SOURCE_TYPE = {
  STATIC: 'static',
  FROM_INPUT: 'fromInput',
  FROM_NODE_OUTPUT: 'fromNodeOutput',
} as const;

/** 参数来源类型选项 */
export const PARAM_SOURCE_OPTIONS = [
  { value: PARAM_SOURCE_TYPE.STATIC, label: '静态值' },
  { value: PARAM_SOURCE_TYPE.FROM_INPUT, label: '来自工作流输入' },
  { value: PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT, label: '来自节点输出' },
];

/**
 * 注册自定义节点类型
 * 使用 workflowOutput 而非 output，避免 ReactFlow 默认样式影响
 */
export const nodeTypes: NodeTypes = {
  script: ScriptNode,
  input: InputNode,
  workflowOutput: OutputNode,
};
