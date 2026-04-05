/**
 * 脚本节点配置面板组件
 */

import React from 'react';
import { Typography, Divider, Empty, theme } from 'antd';
import type { ScriptConfigPanelProps, ParamSource } from '../types';
import ParamSourceSelector from './ParamSourceSelector';

const { Text, Title } = Typography;

/**
 * 脚本节点配置面板
 */
const ScriptConfigPanel: React.FC<ScriptConfigPanelProps> = ({
  data,
  upstreamOutputs = [],
  workflowInputs = [],
  onChange,
}) => {
  const { token } = theme.useToken();

  // 当前参数配置
  const paramsConfig = data.paramsConfig || {};

  /**
   * 处理参数配置变更
   */
  const handleParamChange = (paramName: string, source: ParamSource) => {
    onChange?.({
      ...data,
      paramsConfig: {
        ...paramsConfig,
        [paramName]: source,
      },
    });
  };

  // 如果没有参数，显示空状态
  if (!data.paramsSchema || data.paramsSchema.length === 0) {
    return (
      <Empty
        description="此脚本没有参数需要配置"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: token.marginSM }}>
        <Text type="secondary">脚本名称：</Text>
        <Text strong>{data.name}</Text>
      </div>
      {data.description && (
        <div style={{ marginBottom: token.marginSM }}>
          <Text type="secondary">描述：</Text>
          <Text>{data.description}</Text>
        </div>
      )}

      <Divider style={{ margin: `${token.marginSM}px 0` }} />

      <Title level={5}>参数配置</Title>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        为每个参数选择数据来源
      </Text>

      <div style={{ marginTop: token.marginMD }}>
        {data.paramsSchema.map((param) => (
          <ParamSourceSelector
            key={param.name}
            param={param}
            value={paramsConfig[param.name]}
            upstreamOutputs={upstreamOutputs}
            workflowInputs={workflowInputs}
            onChange={(source) => handleParamChange(param.name, source)}
          />
        ))}
      </div>
    </div>
  );
};

export default ScriptConfigPanel;
