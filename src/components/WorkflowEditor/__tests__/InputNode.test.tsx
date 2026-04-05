/**
 * InputNode 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { ReactFlowProvider } from '@xyflow/react';
import InputNode from '../components/nodes/InputNode';
import type { InputNodeData } from '../components/nodes/InputNode';

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

describe('InputNode', () => {
  const defaultData: InputNodeData = {
    name: '工作流输入',
    inputSchema: [],
  };

  it('should render with default name', () => {
    renderWithProviders(<InputNode data={defaultData} />);

    expect(screen.getByText('工作流输入')).toBeDefined();
  });

  it('should render with custom name', () => {
    const data: InputNodeData = {
      name: '自定义输入',
      inputSchema: [],
    };

    renderWithProviders(<InputNode data={data} />);

    expect(screen.getByText('自定义输入')).toBeDefined();
  });

  it('should show empty state when no input schema', () => {
    renderWithProviders(<InputNode data={defaultData} />);

    expect(screen.getByText('暂无输入参数定义')).toBeDefined();
  });

  it('should render input parameters', () => {
    const data: InputNodeData = {
      name: '工作流输入',
      inputSchema: [
        {
          name: 'input_number',
          label: '输入数字',
          type: 'number',
          required: true,
        },
        {
          name: 'input_text',
          label: '输入文本',
          type: 'text',
          required: false,
        },
      ],
    };

    renderWithProviders(<InputNode data={data} />);

    expect(screen.getByText('输入数字')).toBeDefined();
    expect(screen.getByText('输入文本')).toBeDefined();
    // required marker exists (multiple elements may have *)
    const requiredMarkers = screen.getAllByText('*');
    expect(requiredMarkers.length).toBeGreaterThan(0);
  });

  it('should show correct type tags', () => {
    const data: InputNodeData = {
      name: '工作流输入',
      inputSchema: [
        {
          name: 'num',
          label: '数字',
          type: 'number',
          required: true,
        },
        {
          name: 'txt',
          label: '文本',
          type: 'text',
          required: false,
        },
      ],
    };

    renderWithProviders(<InputNode data={data} />);

    expect(screen.getByText('number')).toBeDefined();
    expect(screen.getByText('text')).toBeDefined();
  });

  it('should apply selected styles when selected', () => {
    const { container } = renderWithProviders(<InputNode data={defaultData} selected />);

    const card = container.querySelector('.ant-card');
    expect(card).toBeDefined();
    // Check for selected state - border should be thicker
    const style = card?.getAttribute('style');
    expect(style).toContain('border');
  });

  it('should render with empty inputSchema gracefully', () => {
    const data: InputNodeData = {
      inputSchema: [],
    };

    renderWithProviders(<InputNode data={data} />);

    expect(screen.getByText('工作流输入')).toBeDefined();
    expect(screen.getByText('暂无输入参数定义')).toBeDefined();
  });
});
