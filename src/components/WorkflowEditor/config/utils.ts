/**
 * 工作流编辑器辅助函数
 *
 * 此文件作为统一导出入口，实际实现已拆分到以下文件：
 * - nodeUtils.ts：节点相关操作
 * - edgeUtils.ts：边相关操作
 * - workflowActions.ts：工作流操作
 * - paramUtils.ts：参数相关
 */

// 从各模块重新导出
export { generateId, workflowNodeToReactFlowNode, buildWorkflowNodes, cleanupNodeParamsConfig, updateNodeParamsConfig, buildDroppedNode, buildPropertyPanelData } from './nodeUtils';
export { workflowEdgeToReactFlowEdge, buildWorkflowEdges, generateEdgesFromParamsConfig, isValidConnection, getEdgeDeletionInfo, createConnectionParamSource } from './edgeUtils';
export { executeWorkflowAction, saveWorkflowAction, undoAction, redoAction, type ExecuteWorkflowParams, type ExecuteWorkflowResult, type SaveWorkflowParams, type SaveWorkflowResult } from './workflowActions';
export { inferInputSchema, buildParamSource } from './paramUtils';
