/**
 * 节点配置面板组件
 *
 * 根据节点类型显示不同的配置界面：
 * - Script 节点：显示参数来源配置（静态值、来自输入、来自上游输出）
 * - Input 节点：显示工作流入参定义表单
 * - Output 节点：显示工作流出参配置（映射到哪个节点的输出）
 */

import React, { useMemo } from 'react';
import { Typography, Divider, Empty, theme } from 'antd';
import type { NodeConfigPanelProps, ScriptNodeData, InputNodeData, OutputNodeData } from './types';
import ScriptConfigPanel from './panels/ScriptConfigPanel';
import InputConfigPanel from './panels/InputConfigPanel';
import OutputConfigPanel from './panels/OutputConfigPanel';

const { Text } = Typography;

/**
 * 节点配置面板组件
 *
 * 根据节点类型渲染不同的配置界面
 */
const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  nodeId,
  nodeType,
  data,
  upstreamOutputs = [],
  workflowInputs = [],
  onChange,
}) => {
  const { token } = theme.useToken();

  /**
   * 渲染对应类型的配置面板
   */
  const renderConfigPanel = useMemo(() => {
    switch (nodeType) {
      case 'script':
        return (
          <ScriptConfigPanel
            data={data as ScriptNodeData}
            upstreamOutputs={upstreamOutputs}
            workflowInputs={workflowInputs}
            onChange={onChange}
          />
        );
      case 'input':
        return (
          <InputConfigPanel
            data={data as InputNodeData}
            onChange={onChange}
          />
        );
      case 'output':
        return (
          <OutputConfigPanel
            data={data as OutputNodeData}
            upstreamOutputs={upstreamOutputs}
            onChange={onChange}
          />
        );
      default:
        return (
          <Empty
            description="未知的节点类型"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
    }
  }, [nodeType, data, upstreamOutputs, workflowInputs, onChange]);

  return (
    <div
      style={{
        padding: token.paddingSM,
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* 节点基本信息 */}
      <div style={{ marginBottom: token.marginSM }}>
        <Text type="secondary">节点 ID：</Text>
        <Text code style={{ fontSize: token.fontSizeSM }}>
          {nodeId}
        </Text>
      </div>

      <Divider style={{ margin: `${token.marginSM}px 0` }} />

      {/* 配置面板 */}
      {renderConfigPanel}
    </div>
  );
};

export default NodeConfigPanel;

// 导出类型
export type {
  NodeConfigPanelProps,
  UpstreamOutput,
  ParamSourceSelectorProps,
  ScriptConfigPanelProps,
  InputConfigPanelProps,
  OutputConfigPanelProps,
} from './types';