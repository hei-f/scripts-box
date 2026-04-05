/**
 * 参数来源选择器组件
 */

import React from 'react';
import { Select, Input, InputNumber, Typography, theme } from 'antd';
import type { ParamSourceSelectorProps, ParamSource, SelectOption } from '../types';
import { PARAM_SOURCE_OPTIONS } from '../constants';

const { Text } = Typography;
const { Option } = Select;

/**
 * 参数来源选择器组件
 */
const ParamSourceSelector: React.FC<ParamSourceSelectorProps> = ({
  param,
  value,
  upstreamOutputs = [],
  workflowInputs = [],
  onChange,
}) => {
  const { token } = theme.useToken();

  // 当前来源类型
  const sourceType = value?.type || 'static';

  /**
   * 处理来源类型变更
   */
  const handleSourceTypeChange = (type: 'static' | 'fromInput' | 'fromNodeOutput') => {
    let newValue: ParamSource;

    switch (type) {
      case 'static':
        // 根据参数类型设置默认静态值
        if (typeof param.type === 'string') {
          switch (param.type) {
            case 'number':
              newValue = { type: 'static', value: 0 };
              break;
            case 'text':
            default:
              newValue = { type: 'static', value: param.default ?? '' };
              break;
          }
        } else {
          // select 或 multi_select
          newValue = { type: 'static', value: param.default ?? '' };
        }
        break;
      case 'fromInput':
        newValue = { type: 'fromInput', paramName: workflowInputs[0]?.name || '' };
        break;
      case 'fromNodeOutput':
        newValue = { type: 'fromNodeOutput', nodeId: '', outputField: '' };
        break;
    }

    onChange?.(newValue);
  };

  /**
   * 处理静态值变更
   */
  const handleStaticValueChange = (newValue: unknown) => {
    onChange?.({ type: 'static', value: newValue });
  };

  /**
   * 处理输入参数名称变更
   */
  const handleInputParamChange = (paramName: string) => {
    onChange?.({ type: 'fromInput', paramName });
  };

  /**
   * 处理上游输出变更
   */
  const handleUpstreamOutputChange = (combinedValue: string) => {
    const [nodeId, outputField] = combinedValue.split('::');
    onChange?.({ type: 'fromNodeOutput', nodeId, outputField });
  };

  /**
   * 渲染静态值输入控件
   */
  const renderStaticValueInput = () => {
    if (typeof param.type === 'string') {
      switch (param.type) {
        case 'number':
          return (
            <InputNumber
              value={value?.type === 'static' ? (value.value as number) : 0}
              onChange={(val) => handleStaticValueChange(val)}
              style={{ width: '100%' }}
              placeholder={`请输入${param.label}`}
            />
          );
        case 'text':
        case 'file_path':
        case 'directory_path':
        default:
          return (
            <Input
              value={value?.type === 'static' ? (value.value as string) : ''}
              onChange={(e) => handleStaticValueChange(e.target.value)}
              placeholder={`请输入${param.label}`}
            />
          );
      }
    }

    // select 或 multi_select 类型
    if (typeof param.type === 'object') {
      let options: SelectOption[] = [];
      if ('select' in param.type) {
        options = param.type.select.options;
      } else if ('multi_select' in param.type) {
        options = param.type.multi_select.options;
      }

      return (
        <Select
          value={value?.type === 'static' ? (value.value as string) : undefined}
          onChange={handleStaticValueChange}
          placeholder={`请选择${param.label}`}
          style={{ width: '100%' }}
          mode={'multi_select' in param.type ? 'multiple' : undefined}
        >
          {options.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
      );
    }

    return null;
  };

  return (
    <div style={{ marginBottom: token.marginSM }}>
      {/* 参数名称和类型标签 */}
      <div style={{ marginBottom: token.marginXXS }}>
        <Text>
          {param.label}
          {param.required && (
            <Text type="danger" style={{ marginLeft: 2 }}>
              *
            </Text>
          )}
        </Text>
        {param.description && (
          <Text type="secondary" style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}>
            {param.description}
          </Text>
        )}
      </div>

      {/* 来源类型选择 */}
      <Select
        value={sourceType}
        onChange={handleSourceTypeChange}
        style={{ width: '100%', marginBottom: token.marginXXS }}
      >
        {PARAM_SOURCE_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>

      {/* 根据来源类型显示不同的输入控件 */}
      {sourceType === 'static' && renderStaticValueInput()}

      {sourceType === 'fromInput' && (
        <Select
          value={value?.type === 'fromInput' ? value.paramName : undefined}
          onChange={handleInputParamChange}
          placeholder="选择输入参数"
          style={{ width: '100%' }}
        >
          {workflowInputs.map((input) => (
            <Option key={input.name} value={input.name}>
              {input.label}
            </Option>
          ))}
        </Select>
      )}

      {sourceType === 'fromNodeOutput' && (
        <Select
          value={
            value?.type === 'fromNodeOutput' && value.nodeId && value.outputField
              ? `${value.nodeId}::${value.outputField}`
              : undefined
          }
          onChange={handleUpstreamOutputChange}
          placeholder="选择上游节点输出"
          style={{ width: '100%' }}
        >
          {upstreamOutputs.map((output) => (
            <Option
              key={`${output.nodeId}::${output.outputField}`}
              value={`${output.nodeId}::${output.outputField}`}
            >
              {output.nodeName} / {output.outputLabel}
            </Option>
          ))}
        </Select>
      )}
    </div>
  );
};

export default ParamSourceSelector;