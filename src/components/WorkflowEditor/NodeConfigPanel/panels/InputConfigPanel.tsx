/**
 * 输入节点配置面板组件
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
import type { InputConfigPanelProps, ParamDefinition } from '../types';
import { PARAM_TYPE_OPTIONS } from '../constants';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * 输入节点配置面板
 */
const InputConfigPanel: React.FC<InputConfigPanelProps> = ({ data, onChange }) => {
  const { token } = theme.useToken();

  // 输入参数列表
  const inputSchema = data.inputSchema || [];

  /**
   * 添加新参数
   */
  const handleAddParam = () => {
    const newParam: ParamDefinition = {
      name: `param_${Date.now()}`,
      label: '新参数',
      type: 'text',
      required: false,
    };

    onChange?.({
      ...data,
      inputSchema: [...inputSchema, newParam],
    });
  };

  /**
   * 删除参数
   */
  const handleDeleteParam = (index: number) => {
    const newSchema = inputSchema.filter((_, i) => i !== index);
    onChange?.({
      ...data,
      inputSchema: newSchema,
    });
  };

  /**
   * 更新参数
   */
  const handleUpdateParam = (index: number, field: keyof ParamDefinition, value: unknown) => {
    const newSchema = [...inputSchema];
    newSchema[index] = {
      ...newSchema[index],
      [field]: value,
    };
    onChange?.({
      ...data,
      inputSchema: newSchema,
    });
  };

  return (
    <div>
      <Title level={5}>工作流输入参数</Title>
      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        定义工作流的输入参数，这些参数可在其他节点中引用
      </Text>

      <Divider style={{ margin: `${token.marginSM}px 0` }} />

      {inputSchema.length === 0 ? (
        <Empty
          description="暂无输入参数"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {inputSchema.map((param, index) => (
            <div
              key={param.name}
              style={{
                padding: token.paddingSM,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: token.marginXS }}>
                <Text strong>参数 {index + 1}</Text>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteParam(index)}
                />
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    参数名称：
                  </Text>
                  <Input
                    value={param.name}
                    onChange={(e) => handleUpdateParam(index, 'name', e.target.value)}
                    placeholder="参数名称（英文标识）"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    显示标签：
                  </Text>
                  <Input
                    value={param.label}
                    onChange={(e) => handleUpdateParam(index, 'label', e.target.value)}
                    placeholder="显示标签"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    参数类型：
                  </Text>
                  <Select
                    value={typeof param.type === 'string' ? param.type : 'text'}
                    onChange={(val) => handleUpdateParam(index, 'type', val)}
                    style={{ width: '100%', marginTop: token.marginXXS }}
                    size="small"
                  >
                    {PARAM_TYPE_OPTIONS.map((opt) => (
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
                    value={param.description || ''}
                    onChange={(e) => handleUpdateParam(index, 'description', e.target.value)}
                    placeholder="参数描述（可选）"
                    size="small"
                    style={{ marginTop: token.marginXXS }}
                  />
                </div>
              </Space>
            </div>
          ))}
        </Space>
      )}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddParam}
        style={{ marginTop: token.marginSM, width: '100%' }}
      >
        添加参数
      </Button>
    </div>
  );
};

export default InputConfigPanel;
