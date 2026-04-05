/**
 * 工作流操作相关函数
 */

import type { Node, Edge } from '@xyflow/react';
import type { Workflow, ScriptConfig } from '../../../types';
import { generateId, buildWorkflowNodes } from './nodeUtils';
import { buildWorkflowEdges } from './edgeUtils';
import { inferInputSchema } from './paramUtils';

/** 执行工作流参数 */
export interface ExecuteWorkflowParams {
  workflowId: string | undefined;
  onExecute?: (data: unknown) => void;
  debugLog: (tag: string, data: Record<string, unknown>) => void;
}

/** 执行工作流结果 */
export interface ExecuteWorkflowResult {
  success: boolean;
  error?: string;
}

/**
 * 执行工作流
 */
export const executeWorkflowAction = async (
  params: ExecuteWorkflowParams,
): Promise<ExecuteWorkflowResult> => {
  const { workflowId, onExecute, debugLog } = params;

  if (!workflowId) {
    return { success: false, error: '请先保存工作流后再执行' };
  }

  const { executeWorkflow } = await import('../../../services/tauri');
  const result = await executeWorkflow(workflowId, {});

  return result.match<ExecuteWorkflowResult>(
    (data) => {
      onExecute?.(data);
      return { success: true };
    },
    (error) => {
      debugLog('handleExecute:error', { workflowId, error });
      return { success: false, error: `执行失败: ${error}` };
    },
  );
};

/** 保存工作流参数 */
export interface SaveWorkflowParams {
  nodes: Node[];
  edges: Edge[];
  workflowMeta: { name: string; description: string };
  existingWorkflowId?: string;
  scriptConfigs: ScriptConfig[];
  onSave?: (workflow: Workflow) => void;
  debugLog: (tag: string, data: Record<string, unknown>) => void;
}

/** 保存工作流结果 */
export interface SaveWorkflowResult {
  success: boolean;
  workflow?: Workflow;
  error?: string;
}

/**
 * 保存工作流
 */
export const saveWorkflowAction = async (
  params: SaveWorkflowParams,
): Promise<SaveWorkflowResult> => {
  const { nodes, edges, workflowMeta, existingWorkflowId, scriptConfigs, onSave, debugLog } = params;

  if (!workflowMeta.name.trim()) {
    return { success: false, error: '请输入工作流名称' };
  }

  const workflowNodes = buildWorkflowNodes(nodes);
  const workflowEdges = buildWorkflowEdges(edges);
  const inputSchema = inferInputSchema(nodes, scriptConfigs);

  const workflow: Workflow = {
    id: existingWorkflowId || generateId(),
    name: workflowMeta.name,
    description: workflowMeta.description,
    nodes: workflowNodes,
    edges: workflowEdges,
    inputSchema,
    outputSchema: [],
  };

  const { createWorkflow, updateWorkflow } = await import('../../../services/tauri');
  const result = existingWorkflowId
    ? await updateWorkflow(workflow)
    : await createWorkflow(workflow);

  return result.match<SaveWorkflowResult>(
    () => {
      onSave?.(workflow);
      return { success: true, workflow };
    },
    (error) => {
      debugLog('handleSave:error', {
        workflowId: workflow.id,
        workflowName: workflow.name,
        error,
        isUpdate: !!existingWorkflowId,
      });
      return { success: false, error: `保存失败: ${error}` };
    },
  );
};

/**
 * 撤销操作
 */
export const undoAction = (): void => {
  // 注意：当前为简化实现，完整实现需要记录操作历史
};

/**
 * 重做操作
 */
export const redoAction = (): void => {
  // 注意：当前为简化实现，完整实现需要记录操作历史
};
