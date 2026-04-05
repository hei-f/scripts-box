/**
 * 工作流操作 Hook
 *
 * 封装工作流相关操作逻辑，包括：
 * - 保存工作流
 * - 执行工作流
 * - 撤销操作（占位）
 * - 重做操作（占位）
 */

import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { Node, Edge } from '@xyflow/react';
import type { Workflow, WorkflowNode, WorkflowEdge, ParamSource, ScriptConfig } from '../../../types';
import type { WorkflowMeta, ScriptNodeData } from '../config/types';
import {
  createWorkflow,
  updateWorkflow,
  executeWorkflow,
} from '../../../services/tauri';
import { generateId, inferInputSchema } from '../config/utils';

interface UseWorkflowActionsOptions {
  /** 节点列表 */
  nodes: Node[];
  /** 边列表 */
  edges: Edge[];
  /** 工作流元数据 */
  workflowMeta: WorkflowMeta;
  /** 初始工作流（编辑模式） */
  initialWorkflow?: Workflow;
  /** 脚本配置列表 */
  scriptConfigs: ScriptConfig[];
  /** 保存成功回调 */
  onSave?: (workflow: Workflow) => void;
  /** 执行成功回调 */
  onExecute?: (result: unknown) => void;
  /** 调试日志函数 */
  debugLog: (tag: string, data: Record<string, unknown>) => void;
}

interface UseWorkflowActionsReturn {
  /** 保存中状态 */
  saving: boolean;
  /** 执行中状态 */
  executing: boolean;
  /** 保存工作流 */
  handleSave: () => Promise<void>;
  /** 执行工作流 */
  handleExecute: () => Promise<void>;
  /** 撤销（当前为占位） */
  handleUndo: () => void;
  /** 重做（当前为占位） */
  handleRedo: () => void;
}

/**
 * 工作流操作 Hook
 */
export function useWorkflowActions({
  nodes,
  edges,
  workflowMeta,
  initialWorkflow,
  scriptConfigs,
  onSave,
  onExecute,
  debugLog,
}: UseWorkflowActionsOptions): UseWorkflowActionsReturn {
  // 保存状态
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  /**
   * 保存工作流
   */
  const handleSave = useCallback(async () => {
    if (!workflowMeta.name.trim()) {
      message.error('请输入工作流名称');
      return;
    }

    setSaving(true);

    // 转换节点数据
    const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      nodeType: (node.type === 'workflowOutput' ? 'output' : node.type) as 'script' | 'input' | 'output',
      scriptId: (node.data as ScriptNodeData).scriptId,
      position: node.position,
      paramsConfig: ((node.data as ScriptNodeData).paramsConfig || {}) as Record<string, ParamSource>,
    }));

    // 转换边数据
    const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || '',
    }));

    // 推断输入参数 schema
    const inputSchema = inferInputSchema(nodes, scriptConfigs);

    const workflow: Workflow = {
      id: initialWorkflow?.id || generateId(),
      name: workflowMeta.name,
      description: workflowMeta.description,
      nodes: workflowNodes,
      edges: workflowEdges,
      inputSchema,
      outputSchema: [],
    };

    // 判断是创建还是更新
    const result = initialWorkflow?.id
      ? await updateWorkflow(workflow)
      : await createWorkflow(workflow);

    result.match(
      () => {
        message.success('工作流保存成功');
        onSave?.(workflow);
      },
      (error) => {
        const errorMsg = `保存失败: ${error}`;
        message.error(errorMsg);
        // 记录错误日志
        debugLog('handleSave:error', {
          workflowId: workflow.id,
          workflowName: workflow.name,
          error,
          isUpdate: !!initialWorkflow?.id,
        });
      }
    );

    setSaving(false);
  }, [nodes, edges, workflowMeta, initialWorkflow, onSave, scriptConfigs, debugLog]);

  /**
   * 执行工作流
   */
  const handleExecute = useCallback(async () => {
    if (!initialWorkflow?.id) {
      message.warning('请先保存工作流后再执行');
      return;
    }

    setExecuting(true);

    const result = await executeWorkflow(initialWorkflow.id, {});

    result.match(
      (data) => {
        message.success('工作流执行成功');
        onExecute?.(data);
      },
      (error) => {
        const errorMsg = `执行失败: ${error}`;
        message.error(errorMsg);
        // 记录错误日志
        debugLog('handleExecute:error', {
          workflowId: initialWorkflow?.id,
          error,
        });
      }
    );

    setExecuting(false);
  }, [initialWorkflow, onExecute, debugLog]);

  /**
   * 撤销
   * 注意：当前为简化实现，完整实现需要记录操作历史
   */
  const handleUndo = useCallback(() => {
    // TODO: 实现完整的撤销功能
    message.info('撤销功能开发中');
  }, []);

  /**
   * 重做
   * 注意：当前为简化实现，完整实现需要记录操作历史
   */
  const handleRedo = useCallback(() => {
    // TODO: 实现完整的重做功能
    message.info('重做功能开发中');
  }, []);

  return {
    saving,
    executing,
    handleSave,
    handleExecute,
    handleUndo,
    handleRedo,
  };
}
