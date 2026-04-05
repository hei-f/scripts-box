/**
 * 节点面板组件
 *
 * 显示可拖拽的脚本列表，用于创建新节点
 */

import React from 'react';
import { Typography, Space, Empty, Spin, Divider, theme } from 'antd';
import type { ScriptConfig } from '../../../../types';

const { Text, Title } = Typography;

interface NodePanelProps {
  /** 脚本配置列表 */
  scriptConfigs: ScriptConfig[];
  /** 是否正在加载 */
  loading: boolean;
  /** 拖拽开始回调 */
  onDragStart: (event: React.DragEvent, scriptConfig: ScriptConfig) => void;
}

/**
 * 节点面板组件
 */
const NodePanel: React.FC<NodePanelProps> = ({ scriptConfigs, loading, onDragStart }) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        padding: token.paddingSM,
        height: '100%',
        overflow: 'auto',
      }}
    >
      <Title level={5} style={{ marginBottom: token.marginSM }}>
        脚本列表
      </Title>
      <Divider style={{ margin: `${token.marginXS}px 0` }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: token.paddingLG }}>
          <Spin />
        </div>
      ) : scriptConfigs.length === 0 ? (
        <Empty description="暂无脚本" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {scriptConfigs.map((config) => (
            <div
              key={config.id}
              draggable
              onDragStart={(e) => onDragStart(e, config)}
              style={{
                padding: token.paddingSM,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                cursor: 'grab',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = token.colorPrimary;
                e.currentTarget.style.background = token.colorPrimaryBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = token.colorBorder;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Text strong style={{ display: 'block' }}>
                {config.name}
              </Text>
              {config.description && (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {config.description}
                </Text>
              )}
            </div>
          ))}
        </Space>
      )}
    </div>
  );
};

export default NodePanel;
