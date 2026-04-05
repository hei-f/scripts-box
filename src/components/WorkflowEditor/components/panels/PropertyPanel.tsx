/**
 * 属性面板组件
 *
 * 显示选中节点的属性和参数配置
 */

import React from 'react';
import { Typography, Divider, Form, Select, Input, Space, Button, Empty, theme } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { Node } from '@xyflow/react';

import { PARAM_SOURCE_TYPE, PARAM_SOURCE_OPTIONS } from '../../config/constants';
import type { ScriptNodeData, PropertyPanelData } from '../../config/types';

const { Text, Title } = Typography;

interface PropertyPanelProps {
  /** 属性面板数据 */
  propertyPanel: PropertyPanelData | null;
  /** 所有节点（用于节点输出选择） */
  nodes: Node[];
  /** 参数配置更新回调 */
  onParamConfigUpdate: (
    paramName: string,
    sourceType: string,
    value?: unknown,
    inputParamName?: string,
    sourceNodeId?: string,
    outputField?: string
  ) => void;
  /** 删除节点回调 */
  onDelete: () => void;
}

/**
 * 属性面板组件
 */
const PropertyPanel: React.FC<PropertyPanelProps> = ({
  propertyPanel,
  nodes,
  onParamConfigUpdate,
  onDelete,
}) => {
  const { token } = theme.useToken();

  if (!propertyPanel) {
    return (
      <Empty
        description="选择节点查看属性"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 40 }}
      />
    );
  }

  const { nodeId, nodeType, data, paramsSchema } = propertyPanel;
  const scriptNodeData = nodeType === 'script' ? (data as ScriptNodeData) : null;
  const paramsConfig = scriptNodeData?.paramsConfig || {};

  return (
    <div style={{ padding: token.paddingSM, height: '100%', overflow: 'auto' }}>
      <Title level={5}>节点属性</Title>
      <Divider style={{ margin: `${token.marginXS}px 0` }} />

      <div style={{ marginBottom: token.marginSM }}>
        <Text type="secondary">节点 ID：</Text>
        <Text code>{nodeId}</Text>
      </div>

      <div style={{ marginBottom: token.marginSM }}>
        <Text type="secondary">节点类型：</Text>
        <Text>
          {nodeType === 'script' ? '脚本节点' : nodeType === 'input' ? '输入节点' : '输出节点'}
        </Text>
      </div>

      {nodeType === 'script' && scriptNodeData && (
        <>
          <div style={{ marginBottom: token.marginSM }}>
            <Text type="secondary">脚本名称：</Text>
            <Text>{scriptNodeData.name}</Text>
          </div>
          {scriptNodeData.description && (
            <div style={{ marginBottom: token.marginSM }}>
              <Text type="secondary">描述：</Text>
              <Text>{scriptNodeData.description}</Text>
            </div>
          )}

          {/* 参数配置区域 */}
          {paramsSchema && paramsSchema.length > 0 && (
            <>
              <Divider style={{ margin: `${token.marginSM}px 0` }} />
              <Title level={5}>参数配置</Title>
              <Form layout="vertical" size="small">
                {paramsSchema.map((param) => {
                  const currentConfig = paramsConfig[param.name];
                  const currentSourceType = currentConfig?.type || PARAM_SOURCE_TYPE.STATIC;
                  const currentValue =
                    currentConfig?.type === 'static' ? currentConfig.value : undefined;

                  return (
                    <Form.Item
                      key={param.name}
                      label={
                        <span>
                          {param.label}
                          {param.required && <Text type="danger">*</Text>}
                        </span>
                      }
                      style={{ marginBottom: token.marginSM }}
                    >
                      {/* 参数来源选择 */}
                      <Select
                        value={currentSourceType}
                        onChange={(value) => {
                          if (value === PARAM_SOURCE_TYPE.STATIC) {
                            onParamConfigUpdate(param.name, value, param.default ?? '');
                          } else if (value === PARAM_SOURCE_TYPE.FROM_INPUT) {
                            onParamConfigUpdate(param.name, value, undefined, param.name);
                          } else {
                            onParamConfigUpdate(param.name, value, undefined, undefined, '', '');
                          }
                        }}
                        options={PARAM_SOURCE_OPTIONS}
                        style={{ width: '100%', marginBottom: token.marginXXS }}
                      />

                      {/* 静态值输入框 */}
                      {currentSourceType === PARAM_SOURCE_TYPE.STATIC && (
                        <Input
                          placeholder="输入静态值"
                          value={currentValue as string}
                          onChange={(e) => {
                            onParamConfigUpdate(param.name, PARAM_SOURCE_TYPE.STATIC, e.target.value);
                          }}
                        />
                      )}

                      {/* 工作流输入参数名 */}
                      {currentSourceType === PARAM_SOURCE_TYPE.FROM_INPUT && (
                        <Input
                          placeholder="工作流输入参数名"
                          value={
                            (currentConfig as { type: 'fromInput'; paramName: string })?.paramName ||
                            param.name
                          }
                          onChange={(e) => {
                            onParamConfigUpdate(
                              param.name,
                              PARAM_SOURCE_TYPE.FROM_INPUT,
                              undefined,
                              e.target.value
                            );
                          }}
                        />
                      )}

                      {/* 节点输出选择 */}
                      {currentSourceType === PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT && (
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <Select
                            placeholder="选择源节点"
                            value={
                              (currentConfig as { type: 'fromNodeOutput'; nodeId: string })
                                ?.nodeId || undefined
                            }
                            onChange={(value) => {
                              const existingConfig = currentConfig as {
                                type: 'fromNodeOutput';
                                nodeId: string;
                                outputField: string;
                              };
                              onParamConfigUpdate(
                                param.name,
                                PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT,
                                undefined,
                                undefined,
                                value,
                                existingConfig?.outputField || ''
                              );
                            }}
                            options={nodes
                              .filter((n) => n.id !== nodeId && n.type === 'script')
                              .map((n) => ({
                                value: n.id,
                                label: (n.data as ScriptNodeData).name || n.id,
                              }))}
                            style={{ width: '100%' }}
                          />
                          <Select
                            placeholder="选择输出字段"
                            value={
                              (currentConfig as { type: 'fromNodeOutput'; outputField: string })
                                ?.outputField || undefined
                            }
                            onChange={(value) => {
                              const existingConfig = currentConfig as {
                                type: 'fromNodeOutput';
                                nodeId: string;
                                outputField: string;
                              };
                              onParamConfigUpdate(
                                param.name,
                                PARAM_SOURCE_TYPE.FROM_NODE_OUTPUT,
                                undefined,
                                undefined,
                                existingConfig?.nodeId || '',
                                value
                              );
                            }}
                            options={(() => {
                              const sourceNodeId = (
                                currentConfig as { type: 'fromNodeOutput'; nodeId: string }
                              )?.nodeId;
                              const sourceNode = nodes.find((n) => n.id === sourceNodeId);
                              if (sourceNode) {
                                const sourceOutputSchema =
                                  (sourceNode.data as ScriptNodeData).outputSchema || [];
                                return sourceOutputSchema.map((output) => ({
                                  value: output.name,
                                  label: output.label,
                                }));
                              }
                              return [];
                            })()}
                            style={{ width: '100%' }}
                          />
                        </Space>
                      )}

                      {/* 参数描述 */}
                      {param.description && (
                        <Text type="secondary" style={{ fontSize: token.fontSizeSM - 2 }}>
                          {param.description}
                        </Text>
                      )}
                    </Form.Item>
                  );
                })}
              </Form>
            </>
          )}
        </>
      )}

      <Button
        danger
        icon={<DeleteOutlined />}
        onClick={onDelete}
        style={{ marginTop: token.marginMD }}
        block
      >
        删除节点
      </Button>
    </div>
  );
};

export default PropertyPanel;
