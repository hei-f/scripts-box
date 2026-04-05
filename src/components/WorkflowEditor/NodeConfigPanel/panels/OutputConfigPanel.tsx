/**
 * 输出节点配置面板组件
 */

import React from 'react';
import {
  Typography,
  Divider,
  Empty,
  Space,
  Button,
  Input,
  Select,
  theme,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { OutputConfigPanelProps, OutputDefinition } from '../types';
import { OUTPUT_TYPE_OPTIONS } from '../constants';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * 输出节点配置面板
 */
const OutputConfigPanel: React.FC<OutputConfigPanelProps> = ({
  data,
  upstreamOutputs = [],
  onChange,
}) => {
  const { token } = theme.useToken();

  // 输出定义列表
  const outputSchema = data.outputSchema || [];

  /**
   * 添加新输出
   */
  const handleAddOutput = () => {
    const newOutput: OutputDefinition = {
      name: `output_${Date.now()}`,
      label: '新输出',
      outputType: 'text',
    };

    onChange?.({
      ...data,
      outputSchema: [...outputSchema, newOutput],
    });
  };

  /**
   * 删除输出
   */
  const handleDeleteOutput = (index: number) => {
    const newSchema = outputSchema.filter((_, i) => i !== index);
    onChange?.({
      ...data,
      outputSchema: newSchema,
    });
  };

  /**
   * 更新输出定义
   */
  const handleUpdateOutput = (index: number, field: keyof OutputDefinition, value: unknown) => {
    const newSchema = [...outputSchema];
    newSchema[index] = {
      ...newSchema[index],
      [field]: value,
    };
    onChange?.({
      ...data,
      outputSchema: newSchema,
    });
  };

  return (
    <div>
      <Title level={5}>工作流输出定义</Title>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        定义工作流的最终输出，映射到上游节点的输出结果
      </Text>

      <Divider style={{ margin: `${token.marginSM}px 0` }} />

      {outputSchema.length === 0 ? (
        <Empty
          description="暂无输出定义"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {outputSchema.map((output, index) => (
            <div
              key={output.name}
              style={{
                padding: token.paddingSM,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: token.marginXS }}>
                <Text strong>输出 {index + 1}</Text>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteOutput(index)}
                />
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    输出名称：
                  </Text>
                  <Input
                    value={output.name}
                    onChange={(e) => handleUpdateOutput(index, 'name', e.target.value)}
                    placeholder="输出名称（英文标识）"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    显示标签：
                  </Text>
                  <Input
                    value={output.label}
                    onChange={(e) => handleUpdateOutput(index, 'label', e.target.value)}
                    placeholder="显示标签"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    输出类型：
                  </Text>
                  <Select
                    value={output.outputType}
                    onChange={(val) => handleUpdateOutput(index, 'outputType', val)}
                    style={{ width: '100%', marginTop: token.marginXXS }}
                    size="small"
                  >
                    {OUTPUT_TYPE_OPTIONS.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    描述：
                  </Text>
                  <Input
                    value={output.description || ''}
                    onChange={(e) => handleUpdateOutput(index, 'description', e.target.value)}
                    placeholder="输出描述（可选）"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    数据来源：
                  </Text>
                  <Select
                    placeholder="选择上游节点输出"
                    style={{ width: '100%', marginTop: token.marginXXS }}
                    size="small"
                  >
                    {upstreamOutputs.map((opt) => (
                      <Option
                        key={`${opt.nodeId}::${opt.outputField}`}
                        value={`${opt.nodeId}::${opt.outputField}`}
                      >
                        {opt.nodeName} / {opt.outputLabel}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Space>
            </div>
          ))}
        </Space>
      )}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddOutput}
        style={{ marginTop: token.marginSM, width: '100%' }}
      >
        添加输出
      </Button>
    </div>
  );
};

export default OutputConfigPanel;