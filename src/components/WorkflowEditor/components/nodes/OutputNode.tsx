/**
 * 输出节点组件
 *
 * 用于在工作流编辑器中显示工作流的输出定义
 * 左侧显示输入端口
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Tag, Typography, theme } from 'antd';
import {
  ExportOutlined,
} from '@ant-design/icons';
import type { OutputDefinition } from '../../../../types/workflow';

const { Text } = Typography;

/**
 * 输出节点数据类型
 */
export interface OutputNodeData extends Record<string, unknown> {
  /** 节点名称 */
  name?: string;
  /** 输出定义列表 */
  outputSchema: OutputDefinition[];
  /** 是否选中 */
  selected?: boolean;
}

/**
 * 获取输出类型的显示颜色
 */
const getOutputTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    text: '#1890ff',
    number: '#52c41a',
    boolean: '#eb2f96',
    json: '#722ed1',
  };
  return colorMap[type] || '#8c8c8c';
};

/**
 * 输出节点组件属性
 */
interface OutputNodeProps {
  data: OutputNodeData;
  selected?: boolean;
}

/**
 * 输出节点组件
 */
const OutputNode: React.FC<OutputNodeProps> = ({ data, selected }) => {
  const { token } = theme.useToken();

  // 小字体大小（Ant Design v6 没有 fontSizeXS，使用 fontSizeSM - 2）
  const fontSizeXS = token.fontSizeSM - 2;

  return (
    <Card
      size="small"
      style={{
        width: 280,
        borderColor: selected || data.selected ? token.colorPrimary : token.colorBorder,
        borderWidth: selected || data.selected ? 2 : 1,
        boxShadow: selected || data.selected
          ? `0 0 0 2px ${token.colorPrimaryBorder}`
          : token.boxShadowSecondary,
        transition: 'all 0.2s ease',
      }}
      styles={{
        body: { padding: token.paddingSM },
      }}
    >
      {/* 节点标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token.marginXXS,
          marginBottom: token.marginXS,
        }}
      >
        <ExportOutlined
          style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }}
        />
        <Text strong>
          {data.name || '工作流输出'}
        </Text>
      </div>

      {/* 输出定义列表 */}
      {data.outputSchema.length > 0 ? (
        data.outputSchema.map((output) => (
          <div
            key={output.name}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${token.paddingXXS}px 0`,
            }}
          >
            {/* 左侧输入端口 */}
            <Handle
              type="target"
              position={Position.Left}
              id={`input-${output.name}`}
              style={{
                left: 0,
                width: 10,
                height: 10,
                background: getOutputTypeColor(output.outputType),
                border: `2px solid ${token.colorBgContainer}`,
              }}
            />
            <Text style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}>
              {output.label}
            </Text>
            <Tag
              style={{
                fontSize: fontSizeXS,
                margin: 0,
                color: getOutputTypeColor(output.outputType),
                borderColor: getOutputTypeColor(output.outputType),
                background: 'transparent',
              }}
            >
              {output.outputType}
            </Tag>
          </div>
        ))
      ) : (
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          暂无输出定义
        </Text>
      )}
    </Card>
  );
};

export default memo(OutputNode);
