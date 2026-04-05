/**
 * 输入节点组件
 *
 * 用于在工作流编辑器中显示工作流的输入参数定义
 * 右侧显示输出端口（每个参数一个端口）
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Tag, Typography, theme } from 'antd';
import {
  ImportOutlined,
} from '@ant-design/icons';
import type { ParamDefinition } from '../../../../types';
import { getParamTypeColor } from '../../config/colors';
import { INPUT_NODE_WIDTH, HANDLE_SIZE } from '../../config/dimensions';

const { Text } = Typography;

/**
 * 输入节点数据类型
 */
export interface InputNodeData extends Record<string, unknown> {
  /** 节点名称 */
  name?: string;
  /** 输入参数定义列表 */
  inputSchema: ParamDefinition[];
  /** 是否选中 */
  selected?: boolean;
}

/**
 * 参数类型转换为显示字符串
 */
const paramTypeToString = (type: ParamDefinition['type']): string => {
  if (typeof type === 'string') {
    return type;
  }
  if ('select' in type) {
    return 'select';
  }
  if ('multi_select' in type) {
    return 'multi_select';
  }
  return 'unknown';
};

/**
 * 输入节点组件属性
 */
interface InputNodeProps {
  data: InputNodeData;
  selected?: boolean;
}

/**
 * 输入节点组件
 */
const InputNode: React.FC<InputNodeProps> = ({ data, selected }) => {
  const { token } = theme.useToken();

  // 小字体大小（Ant Design v6 没有 fontSizeXS，使用 fontSizeSM - 2）
  const fontSizeXS = token.fontSizeSM - 2;

  return (
    <Card
      size="small"
      style={{
        width: INPUT_NODE_WIDTH,
        borderColor: selected || data.selected ? token.colorPrimary : token.colorBorder,
        borderWidth: selected || data.selected ? 2 : 1,
        boxShadow: selected || data.selected
          ? `0 0 0 2px ${token.colorPrimaryBorder}`
          : token.boxShadowSecondary,
        transition: 'all 0.2s ease',
        background: token.colorSuccessBg,
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
          marginBottom: token.marginSM,
        }}
      >
        <ImportOutlined
          style={{ color: token.colorSuccess, fontSize: token.fontSizeLG }}
        />
        <Text strong style={{ color: token.colorSuccess }}>
          {data.name || '工作流输入'}
        </Text>
      </div>

      {/* 输入参数列表 */}
      {data.inputSchema.length > 0 ? (
        data.inputSchema.map((param) => (
          <div
            key={param.name}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${token.paddingXXS}px 0`,
            }}
          >
            <Text style={{ fontSize: token.fontSizeSM }}>
              {param.label}
              {param.required && (
                <Text type="danger" style={{ marginLeft: 2 }}>
                  *
                </Text>
              )}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXXS }}>
              <Tag
                style={{
                  fontSize: fontSizeXS,
                  margin: 0,
                  color: getParamTypeColor(paramTypeToString(param.type)),
                  borderColor: getParamTypeColor(paramTypeToString(param.type)),
                  background: 'transparent',
                }}
              >
                {paramTypeToString(param.type)}
              </Tag>
            </div>
            {/* 右侧输出端口 */}
            <Handle
              type="source"
              position={Position.Right}
              id={`output-${param.name}`}
              style={{
                right: 0,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: getParamTypeColor(paramTypeToString(param.type)),
                border: `2px solid ${token.colorBgContainer}`,
              }}
            />
          </div>
        ))
      ) : (
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          暂无输入参数定义
        </Text>
      )}
    </Card>
  );
};

export default memo(InputNode);
