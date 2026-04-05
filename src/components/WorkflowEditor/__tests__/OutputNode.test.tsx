/**
 * OutputNode 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { ReactFlowProvider } from '@xyflow/react';
import OutputNode from '../components/nodes/OutputNode';
import type { OutputNodeData } from '../components/nodes/OutputNode';

/**
 * 包装组件，提供主题上下文和 ReactFlow 上下文
 */
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ConfigProvider>
      <ReactFlowProvider>{ui}</ReactFlowProvider>
    </ConfigProvider>
  );
};

describe('OutputNode', () => {
  const defaultData: OutputNodeData = {
    name: '工作流输出',
    outputSchema: [],
  };

  it('should render with default name', () => {
    renderWithProviders(<OutputNode data={defaultData} />);

    expect(screen.getByText('工作流输出')).toBeDefined();
  });

  it('should render with custom name', () => {
    const data: OutputNodeData = {
      name: '自定义输出',
      outputSchema: [],
    };

    renderWithProviders(<OutputNode data={data} />);

    expect(screen.getByText('自定义输出')).toBeDefined();
  });

  it('should show empty state when no output schema', () => {
    renderWithProviders(<OutputNode data={defaultData} />);

    expect(screen.getByText('暂无输出定义')).toBeDefined();
  });

  it('should render output definitions', () => {
    const data: OutputNodeData = {
      name: '工作流输出',
      outputSchema: [
        {
          name: 'result',
          label: '计算结果',
          outputType: 'number',
          description: '最终计算结果',
        },
        {
          name: 'data',
          label: '数据',
          outputType: 'json',
        },
      ],
    };

    renderWithProviders(<OutputNode data={data} />);

    expect(screen.getByText('计算结果')).toBeDefined();
    expect(screen.getByText('数据')).toBeDefined();
  });

  it('should show correct output type tags', () => {
    const data: OutputNodeData = {
      name: '工作流输出',
      outputSchema: [
        {
          name: 'num_result',
          label: '数字结果',
          outputType: 'number',
        },
        {
          name: 'text_result',
          label: '文本结果',
          outputType: 'text',
        },
        {
          name: 'bool_result',
          label: '布尔结果',
          outputType: 'boolean',
        },
        {
          name: 'json_result',
          label: 'JSON结果',
          outputType: 'json',
        },
      ],
    };

    renderWithProviders(<OutputNode data={data} />);

    expect(screen.getByText('number')).toBeDefined();
    expect(screen.getByText('text')).toBeDefined();
    expect(screen.getByText('boolean')).toBeDefined();
    expect(screen.getByText('json')).toBeDefined();
  });

  it('should apply selected styles when selected', () => {
    const { container } = renderWithProviders(<OutputNode data={defaultData} selected />);

    const card = container.querySelector('.ant-card');
    expect(card).toBeDefined();
    // Check for selected state - border should be thicker
    const style = card?.getAttribute('style');
    expect(style).toContain('border');
  });

  it('should render with empty outputSchema gracefully', () => {
    const data: OutputNodeData = {
      outputSchema: [],
    };

    renderWithProviders(<OutputNode data={data} />);

    expect(screen.getByText('工作流输出')).toBeDefined();
    expect(screen.getByText('暂无输出定义')).toBeDefined();
  });
});
