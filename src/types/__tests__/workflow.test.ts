/**
 * 工作流类型定义测试
 */

import { describe, it, expect } from 'vitest';
import type {
  NodeType,
  OutputType,
  ParamSource,
  WorkflowNode,
  WorkflowEdge,
  OutputDefinition,
  Workflow,
  WorkflowInfo,
  NodeResult,
  WorkflowResult,
} from '../workflow';

describe('workflow types', () => {
  describe('NodeType', () => {
    it('should accept valid node types', () => {
      const scriptType: NodeType = 'script';
      const inputType: NodeType = 'input';
      const outputType: NodeType = 'output';

      expect(scriptType).toBe('script');
      expect(inputType).toBe('input');
      expect(outputType).toBe('output');
    });
  });

  describe('OutputType', () => {
    it('should accept valid output types', () => {
      const textType: OutputType = 'text';
      const numberType: OutputType = 'number';
      const booleanType: OutputType = 'boolean';
      const jsonType: OutputType = 'json';

      expect(textType).toBe('text');
      expect(numberType).toBe('number');
      expect(booleanType).toBe('boolean');
      expect(jsonType).toBe('json');
    });
  });

  describe('ParamSource', () => {
    it('should create static param source', () => {
      const staticSource: ParamSource = { type: 'static', value: 42 };
      expect(staticSource.type).toBe('static');
      expect(staticSource.value).toBe(42);
    });

    it('should create fromInput param source', () => {
      const inputSource: ParamSource = { type: 'fromInput', paramName: 'input_number' };
      expect(inputSource.type).toBe('fromInput');
      if (inputSource.type === 'fromInput') {
        expect(inputSource.paramName).toBe('input_number');
      }
    });

    it('should create fromNodeOutput param source', () => {
      const nodeOutputSource: ParamSource = {
        type: 'fromNodeOutput',
        nodeId: 'add_node',
        outputField: 'result',
      };
      expect(nodeOutputSource.type).toBe('fromNodeOutput');
      if (nodeOutputSource.type === 'fromNodeOutput') {
        expect(nodeOutputSource.nodeId).toBe('add_node');
        expect(nodeOutputSource.outputField).toBe('result');
      }
    });
  });

  describe('WorkflowNode', () => {
    it('should create script node', () => {
      const node: WorkflowNode = {
        id: 'script_node_1',
        nodeType: 'script',
        scriptId: 'add_numbers',
        position: { x: 100, y: 200 },
        paramsConfig: {
          a: { type: 'fromInput', paramName: 'input_a' },
          b: { type: 'static', value: 10 },
        },
      };

      expect(node.id).toBe('script_node_1');
      expect(node.nodeType).toBe('script');
      expect(node.scriptId).toBe('add_numbers');
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(200);
      expect(node.paramsConfig['a'].type).toBe('fromInput');
    });

    it('should create input node without scriptId', () => {
      const node: WorkflowNode = {
        id: 'input_node',
        nodeType: 'input',
        position: { x: 50, y: 100 },
        paramsConfig: {},
      };

      expect(node.id).toBe('input_node');
      expect(node.nodeType).toBe('input');
      expect(node.scriptId).toBeUndefined();
    });

    it('should create output node', () => {
      const node: WorkflowNode = {
        id: 'output_node',
        nodeType: 'output',
        position: { x: 500, y: 100 },
        paramsConfig: {
          result: {
            type: 'fromNodeOutput',
            nodeId: 'add_node',
            outputField: 'result',
          },
        },
      };

      expect(node.nodeType).toBe('output');
      expect(node.paramsConfig['result'].type).toBe('fromNodeOutput');
    });
  });

  describe('WorkflowEdge', () => {
    it('should create workflow edge', () => {
      const edge: WorkflowEdge = {
        id: 'edge_1',
        source: 'input_node',
        target: 'add_node',
        sourceHandle: 'output-value',
        targetHandle: 'input-a',
      };

      expect(edge.id).toBe('edge_1');
      expect(edge.source).toBe('input_node');
      expect(edge.target).toBe('add_node');
      expect(edge.sourceHandle).toBe('output-value');
      expect(edge.targetHandle).toBe('input-a');
    });
  });

  describe('OutputDefinition', () => {
    it('should create output definition', () => {
      const output: OutputDefinition = {
        name: 'result',
        label: '计算结果',
        outputType: 'number',
        description: '最终计算结果',
      };

      expect(output.name).toBe('result');
      expect(output.label).toBe('计算结果');
      expect(output.outputType).toBe('number');
      expect(output.description).toBe('最终计算结果');
    });

    it('should create output definition without description', () => {
      const output: OutputDefinition = {
        name: 'data',
        label: '数据',
        outputType: 'json',
      };

      expect(output.name).toBe('data');
      expect(output.description).toBeUndefined();
    });
  });

  describe('Workflow', () => {
    it('should create complete workflow', () => {
      const workflow: Workflow = {
        id: 'arithmetic_demo',
        name: '四则运算演示',
        description: '将输入数字加10后乘2',
        nodes: [
          {
            id: 'input_node',
            nodeType: 'input',
            position: { x: 50, y: 150 },
            paramsConfig: {},
          },
          {
            id: 'add_node',
            nodeType: 'script',
            scriptId: 'add_numbers',
            position: { x: 250, y: 150 },
            paramsConfig: {
              a: { type: 'fromInput', paramName: 'input_number' },
              b: { type: 'static', value: 10 },
            },
          },
          {
            id: 'output_node',
            nodeType: 'output',
            position: { x: 450, y: 150 },
            paramsConfig: {
              result: {
                type: 'fromNodeOutput',
                nodeId: 'add_node',
                outputField: 'result',
              },
            },
          },
        ],
        edges: [
          {
            id: 'edge_1',
            source: 'input_node',
            target: 'add_node',
            sourceHandle: 'output-input_number',
            targetHandle: 'input-a',
          },
        ],
        inputSchema: [
          {
            name: 'input_number',
            label: '输入数字',
            type: 'number',
            required: true,
          },
        ],
        outputSchema: [
          {
            name: 'result',
            label: '计算结果',
            outputType: 'number',
          },
        ],
      };

      expect(workflow.id).toBe('arithmetic_demo');
      expect(workflow.nodes).toHaveLength(3);
      expect(workflow.edges).toHaveLength(1);
      expect(workflow.inputSchema).toHaveLength(1);
      expect(workflow.outputSchema).toHaveLength(1);
    });
  });

  describe('WorkflowInfo', () => {
    it('should create workflow info', () => {
      const info: WorkflowInfo = {
        id: 'workflow_1',
        name: '测试工作流',
        description: '这是一个测试',
        createdAt: 1712345678000,
        updatedAt: 1712345678000,
      };

      expect(info.id).toBe('workflow_1');
      expect(info.name).toBe('测试工作流');
      expect(info.createdAt).toBe(1712345678000);
    });

    it('should create workflow info without description', () => {
      const info: WorkflowInfo = {
        id: 'workflow_2',
        name: '简单工作流',
        createdAt: 1712345678000,
        updatedAt: 1712345678000,
      };

      expect(info.description).toBeUndefined();
    });
  });

  describe('NodeResult', () => {
    it('should create successful node result', () => {
      const result: NodeResult = {
        success: true,
        output: '执行成功',
        outputs: { result: 42 },
        durationMs: 150,
      };

      expect(result.success).toBe(true);
      expect(result.output).toBe('执行成功');
      expect(result.outputs?.result).toBe(42);
      expect(result.durationMs).toBe(150);
    });

    it('should create failed node result', () => {
      const result: NodeResult = {
        success: false,
        error: '执行失败: 参数错误',
        durationMs: 10,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('执行失败: 参数错误');
      expect(result.outputs).toBeUndefined();
    });
  });

  describe('WorkflowResult', () => {
    it('should create successful workflow result', () => {
      const result: WorkflowResult = {
        success: true,
        outputs: { final_result: 30 },
        nodeResults: {
          add_node: {
            success: true,
            outputs: { result: 30 },
            durationMs: 100,
          },
        },
      };

      expect(result.success).toBe(true);
      expect(result.outputs.final_result).toBe(30);
      expect(result.nodeResults['add_node'].success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should create failed workflow result', () => {
      const result: WorkflowResult = {
        success: false,
        outputs: {},
        nodeResults: {},
        error: '部分节点执行失败',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('部分节点执行失败');
    });
  });
});
