/**
 * 工作流相关服务测试
 *
 * 测试工作流相关的 Tauri 命令调用封装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 导入被测试模块
import type { Workflow, WorkflowInfo, WorkflowResult, OutputDefinition } from '../../types';

// Mock @tauri-apps/api/core - 必须在模块顶部使用 vi.hoisted
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// 在 mock 之后导入，获取 mock 后的 invoke
import { invoke } from '@tauri-apps/api/core';
import {
  createWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getScriptOutputSchema,
} from '../tauri';

// 获取 mock 函数
const mockInvoke = vi.mocked(invoke);

describe('workflow tauri commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createWorkflow', () => {
    it('should call invoke with correct parameters', async () => {
      const workflow: Workflow = {
        id: 'test_workflow',
        name: '测试工作流',
        nodes: [],
        edges: [],
        inputSchema: [],
        outputSchema: [],
      };

      mockInvoke.mockResolvedValueOnce(undefined);

      const result = createWorkflow(workflow);
      const value = await result;

      expect(mockInvoke).toHaveBeenCalledWith('create_workflow', { workflow });
      expect(value.isOk()).toBe(true);
    });

    it('should return error when invoke fails', async () => {
      const workflow: Workflow = {
        id: 'test_workflow',
        name: '测试工作流',
        nodes: [],
        edges: [],
        inputSchema: [],
        outputSchema: [],
      };

      mockInvoke.mockRejectedValueOnce(new Error('创建失败'));

      const result = await createWorkflow(workflow);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('创建失败');
      }
    });
  });

  describe('getWorkflow', () => {
    it('should call invoke with correct id', async () => {
      const mockWorkflow: Workflow = {
        id: 'workflow_1',
        name: '工作流1',
        nodes: [],
        edges: [],
        inputSchema: [],
        outputSchema: [],
      };

      mockInvoke.mockResolvedValueOnce(mockWorkflow);

      const result = await getWorkflow('workflow_1');

      expect(mockInvoke).toHaveBeenCalledWith('get_workflow', { id: 'workflow_1' });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockWorkflow);
      }
    });

    it('should return error for non-existent workflow', async () => {
      mockInvoke.mockRejectedValueOnce({ type: 'NotFoundError', message: '工作流不存在' });

      const result = await getWorkflow('nonexistent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain('工作流不存在');
      }
    });
  });

  describe('listWorkflows', () => {
    it('should return workflow info list', async () => {
      const mockWorkflows: WorkflowInfo[] = [
        {
          id: 'workflow_1',
          name: '工作流1',
          createdAt: 1712345678000,
          updatedAt: 1712345678000,
        },
        {
          id: 'workflow_2',
          name: '工作流2',
          description: '描述',
          createdAt: 1712345678000,
          updatedAt: 1712345678000,
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockWorkflows);

      const result = await listWorkflows();

      expect(mockInvoke).toHaveBeenCalledWith('list_workflows', undefined);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].id).toBe('workflow_1');
        expect(result.value[1].description).toBe('描述');
      }
    });

    it('should return empty list when no workflows', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const result = await listWorkflows();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('updateWorkflow', () => {
    it('should call invoke with workflow data', async () => {
      const workflow: Workflow = {
        id: 'workflow_1',
        name: '更新后的工作流',
        description: '更新描述',
        nodes: [],
        edges: [],
        inputSchema: [],
        outputSchema: [],
      };

      mockInvoke.mockResolvedValueOnce(undefined);

      const result = await updateWorkflow(workflow);

      expect(mockInvoke).toHaveBeenCalledWith('update_workflow', { workflow });
      expect(result.isOk()).toBe(true);
    });
  });

  describe('deleteWorkflow', () => {
    it('should call invoke with correct id', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const result = await deleteWorkflow('workflow_to_delete');

      expect(mockInvoke).toHaveBeenCalledWith('delete_workflow', { id: 'workflow_to_delete' });
      expect(result.isOk()).toBe(true);
    });

    it('should handle delete error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('删除失败'));

      const result = await deleteWorkflow('workflow_to_delete');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('删除失败');
      }
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow with parameters', async () => {
      const mockResult: WorkflowResult = {
        success: true,
        outputs: { result: 30 },
        nodeResults: {
          add_node: {
            success: true,
            outputs: { result: 30 },
            durationMs: 100,
          },
        },
      };

      mockInvoke.mockResolvedValueOnce(mockResult);

      const result = await executeWorkflow('arithmetic_demo', { input_number: 5 });

      expect(mockInvoke).toHaveBeenCalledWith('execute_workflow', {
        id: 'arithmetic_demo',
        params: { input_number: 5 },
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.outputs.result).toBe(30);
      }
    });

    it('should handle execution failure', async () => {
      const mockResult: WorkflowResult = {
        success: false,
        outputs: {},
        nodeResults: {},
        error: '节点执行失败',
      };

      mockInvoke.mockResolvedValueOnce(mockResult);

      const result = await executeWorkflow('test_workflow', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toBe('节点执行失败');
      }
    });

    it('should handle workflow not found error', async () => {
      mockInvoke.mockRejectedValueOnce({ type: 'NotFoundError', message: '工作流不存在' });

      const result = await executeWorkflow('nonexistent', {});

      expect(result.isErr()).toBe(true);
    });
  });

  describe('getScriptOutputSchema', () => {
    it('should return output definitions', async () => {
      const mockOutputs: OutputDefinition[] = [
        {
          name: 'result',
          label: '结果',
          outputType: 'number',
          description: '计算结果',
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockOutputs);

      const result = await getScriptOutputSchema('add_numbers');

      expect(mockInvoke).toHaveBeenCalledWith('get_script_output_schema', { id: 'add_numbers' });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('result');
        expect(result.value[0].outputType).toBe('number');
      }
    });

    it('should return empty array for script without outputs', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const result = await getScriptOutputSchema('simple_script');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle script not found', async () => {
      mockInvoke.mockRejectedValueOnce({ type: 'NotFoundError', message: '脚本不存在' });

      const result = await getScriptOutputSchema('nonexistent');

      expect(result.isErr()).toBe(true);
    });
  });
});
