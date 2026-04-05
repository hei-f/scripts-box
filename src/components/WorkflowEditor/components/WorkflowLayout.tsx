/**
 * 工作流布局展示组件
 *
 * 使用 Ant Design Layout 组合子组件，提供三栏布局：
 * - 左侧：节点面板
 * - 中间：工具栏 + 画布
 * - 右侧：属性面板
 */

import React from 'react';
import { Layout, theme } from 'antd';

const { Sider, Content } = Layout;

/** 左侧面板默认宽度 */
const DEFAULT_NODE_PANEL_WIDTH = 220;

/** 右侧面板默认宽度 */
const DEFAULT_PROPERTY_PANEL_WIDTH = 300;

/**
 * WorkflowLayout 组件属性
 */
export interface WorkflowLayoutProps {
  /** 左侧节点面板内容 */
  nodePanel?: React.ReactNode;
  /** 顶部工具栏内容 */
  toolbar?: React.ReactNode;
  /** 中间画布内容 */
  canvas?: React.ReactNode;
  /** 右侧属性面板内容 */
  propertyPanel?: React.ReactNode;
  /** 左侧面板宽度 */
  nodePanelWidth?: number;
  /** 右侧面板宽度 */
  propertyPanelWidth?: number;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

/**
 * 工作流布局组件
 *
 * 提供标准的三栏布局结构
 */
const WorkflowLayout: React.FC<WorkflowLayoutProps> = ({
  nodePanel,
  toolbar,
  canvas,
  propertyPanel,
  nodePanelWidth = DEFAULT_NODE_PANEL_WIDTH,
  propertyPanelWidth = DEFAULT_PROPERTY_PANEL_WIDTH,
  style,
  className,
}) => {
  const { token } = theme.useToken();

  return (
    <Layout
      style={{
        height: '100%',
        background: token.colorBgContainer,
        ...style,
      }}
      className={className}
    >
      {/* 左侧节点面板 */}
      {nodePanel && (
        <Sider
          width={nodePanelWidth}
          theme="light"
          style={{
            borderRight: `1px solid ${token.colorBorder}`,
            overflow: 'hidden',
          }}
        >
          {nodePanel}
        </Sider>
      )}

      {/* 中间区域 */}
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* 工具栏 */}
        {toolbar}

        {/* 画布区域 */}
        {canvas && (
          <div
            style={{
              flex: 1,
              position: 'relative',
              minHeight: 0,
              width: '100%',
              height: '100%',
            }}
          >
            {canvas}
          </div>
        )}
      </Content>

      {/* 右侧属性面板 */}
      {propertyPanel && (
        <Sider
          width={propertyPanelWidth}
          theme="light"
          style={{
            borderLeft: `1px solid ${token.colorBorder}`,
            overflow: 'auto',
          }}
        >
          <div style={{ height: '100%', overflow: 'auto' }}>
            {propertyPanel}
          </div>
        </Sider>
      )}
    </Layout>
  );
};

export default WorkflowLayout;