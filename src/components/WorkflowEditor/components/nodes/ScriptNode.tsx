/**
 * 脚本节点组件
 *
 * 用于在工作流编辑器中显示脚本节点，支持：
 * - 左侧输入端口（基于脚本 params_schema）
 * - 右侧输出端口（基于脚本 output_schema）
 * - 显示脚本名称和描述
 * - 选中高亮效果
 * - 参数状态显示（已连线、已设置、待输入）
 */

import React, { memo } from 'react';
import { Handle, Position, useEdges, useNodeId } from '@xyflow/react';
import { Card, Tag, Typography, theme } from 'antd';
import {
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ParamDefinition } from '../../../../types';
import type { OutputDefinition, ParamSource } from '../../../../types/workflow';
import type { Edge } from '@xyflow/react';
import { getParamTypeColor, getOutputTypeColor } from '../../config/colors';
import { NODE_WIDTH, HANDLE_SIZE } from '../../config/dimensions';

const { Text } = Typography;

// ==================== 常量定义 ====================

/** 参数状态类型 */
const PARAM_STATUS = {
  CONNECTED: 'connected',   // 已连线
  CONFIGURED: 'configured', // 已设置
  PENDING: 'pending',       // 待输入
} as const;

/** 参数状态显示文本 */
const PARAM_STATUS_TEXT: Record<string, string> = {
  [PARAM_STATUS.CONNECTED]: '已连线',
  [PARAM_STATUS.CONFIGURED]: '已设置',
  [PARAM_STATUS.PENDING]: '待输入',
};

/**
 * 脚本节点数据类型
 */
export interface ScriptNodeData extends Record<string, unknown> {
  /** 脚本 ID */
  scriptId: string;
  /** 脚本名称 */
  name?: string;
  /** 脚本描述 */
  description?: string;
  /** 输入参数定义 */
  paramsSchema?: ParamDefinition[];
  /** 输出定义 */
  outputSchema?: OutputDefinition[];
  /** 是否选中 */
  selected?: boolean;
  /** 参数配置（参数名 -> 参数来源） */
  paramsConfig?: Record<string, ParamSource>;
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
 * 判断参数状态
 *
 * @param paramName - 参数名
 * @param paramsConfig - 参数配置
 * @param edges - 连接边列表
 * @param nodeId - 当前节点 ID
 * @returns 参数状态
 */
const getParamStatus = (
  paramName: string,
  paramsConfig: Record<string, ParamSource> | undefined,
  edges: Edge[],
  nodeId: string | undefined,
): string => {
  // 首先检查是否已连线（通过边连接）
  if (nodeId) {
    const targetHandleId = `input-${paramName}`;
    const isConnected = edges.some(
      (edge) => edge.target === nodeId && edge.targetHandle === targetHandleId
    );
    if (isConnected) {
      return PARAM_STATUS.CONNECTED;
    }
  }

  // 检查是否已在 paramsConfig 中配置
  if (paramsConfig && paramName in paramsConfig) {
    return PARAM_STATUS.CONFIGURED;
  }

  // 未配置，待输入
  return PARAM_STATUS.PENDING;
};

/**
 * 获取参数状态标签的颜色
 *
 * @param status - 参数状态
 * @param token - Ant Design token
 * @returns 颜色值
 */
const getParamStatusColor = (
  status: string,
  token: ReturnType<typeof theme.useToken>['token'],
): string => {
  switch (status) {
    case PARAM_STATUS.CONNECTED:
      return token.colorSuccess;
    case PARAM_STATUS.CONFIGURED:
      return token.colorInfo;
    case PARAM_STATUS.PENDING:
      return token.colorWarning;
    default:
      return token.colorTextSecondary;
  }
};

/**
 * 脚本节点组件属性
 */
interface ScriptNodeProps {
  data: ScriptNodeData;
  selected?: boolean;
}

/**
 * 脚本节点组件
 */
const ScriptNode: React.FC<ScriptNodeProps> = ({ data, selected }) => {
  const { token } = theme.useToken();
  // 获取边信息用于判断参数连线状态
  const edges = useEdges();
  // 获取当前节点 ID
  const nodeId = useNodeId();

  // 小字体大小（Ant Design v6 没有 fontSizeXS，使用 fontSizeSM - 2）
  const fontSizeXS = token.fontSizeSM - 2;

  return (
    <Card
      size="small"
      style={{
        width: NODE_WIDTH,
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
        <PlayCircleOutlined
          style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }}
        />
        <Text strong ellipsis style={{ flex: 1 }}>
          {data.name || data.scriptId || '未知脚本'}
        </Text>
      </div>

      {/* 节点描述 */}
      {data.description && (
        <Text
          type="secondary"
          style={{
            fontSize: token.fontSizeSM,
            display: 'block',
            marginBottom: token.marginSM,
          }}
          ellipsis
        >
          {data.description}
        </Text>
      )}

      {/* 输入端口区域 */}
      {(data.paramsSchema?.length ?? 0) > 0 && (
        <div style={{ marginBottom: token.marginXS }}>
          <Text type="secondary" style={{ fontSize: fontSizeXS }}>
            输入参数
          </Text>
          {data.paramsSchema?.map((param) => {
            // 获取参数状态
            const paramStatus = getParamStatus(
              param.name,
              data.paramsConfig,
              edges,
              nodeId ?? undefined
            );
            const statusColor = getParamStatusColor(paramStatus, token);

            return (
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
                {/* 左侧输入端口 */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`input-${param.name}`}
                  style={{
                    left: 0,
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    borderRadius: '50%',
                    background: getParamTypeColor(paramTypeToString(param.type)),
                    border: `2px solid ${token.colorBgContainer}`,
                  }}
                />
                <Text style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}>
                  {param.label}
                  {param.required && (
                    <Text type="danger" style={{ marginLeft: 2 }}>
                      *
                    </Text>
                  )}
                </Text>
                {/* 参数状态标签 */}
                <Tag
                  style={{
                    fontSize: fontSizeXS,
                    margin: 0,
                    color: statusColor,
                    borderColor: statusColor,
                    background: 'transparent',
                  }}
                >
                  {PARAM_STATUS_TEXT[paramStatus]}
                </Tag>
              </div>
            );
          })}
        </div>
      )}

      {/* 输出端口区域 */}
      {(data.outputSchema?.length ?? 0) > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: fontSizeXS }}>
            输出
          </Text>
          {data.outputSchema?.map((output) => (
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
              <Text style={{ fontSize: token.fontSizeSM }}>{output.label}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXXS }}>
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
              {/* 右侧输出端口 */}
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${output.name}`}
                style={{
                  right: 0,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  borderRadius: '50%',
                  background: getOutputTypeColor(output.outputType),
                  border: `2px solid ${token.colorBgContainer}`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default memo(ScriptNode);
