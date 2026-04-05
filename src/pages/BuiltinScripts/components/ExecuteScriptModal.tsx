/**
 * 执行脚本弹窗组件
 */

import React, { useCallback } from 'react';
import {
  Modal,
  Button,
  Spin,
  Form,
  InputNumber,
  Input,
  Select,
  Card,
  Alert,
  Row,
  Col,
} from 'antd';
import { FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import type { ExecuteScriptModalProps, ParamDefinition } from '../types';
import { shouldShowParam, getSelectOptions } from '../utils';

/**
 * 参数输入控件渲染器属性
 */
interface ParamInputRendererProps {
  param: ParamDefinition;
  onOpenFileDialog: (fieldName: string, isDirectory: boolean) => void;
}

/**
 * 渲染参数输入控件
 */
const ParamInputRenderer: React.FC<ParamInputRendererProps> = ({
  param,
  onOpenFileDialog,
}) => {
  const paramType = param.type;

  // 简单类型是字符串，复杂类型是对象
  if (typeof paramType === 'string') {
    switch (paramType) {
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`请输入${param.label}`}
          />
        );
      case 'file_path':
        return (
          <Input
            placeholder="点击选择文件"
            readOnly
            onClick={() => onOpenFileDialog(param.name, false)}
            suffix={(
              <Button
                type="text"
                size="small"
                icon={<FileOutlined />}
                onClick={() => onOpenFileDialog(param.name, false)}
              />
            )}
          />
        );
      case 'directory_path':
        return (
          <Input
            placeholder="点击选择目录"
            readOnly
            onClick={() => onOpenFileDialog(param.name, true)}
            suffix={(
              <Button
                type="text"
                size="small"
                icon={<FolderOpenOutlined />}
                onClick={() => onOpenFileDialog(param.name, true)}
              />
            )}
          />
        );
      case 'text':
      default:
        return <Input placeholder={`请输入${param.label}`} />;
    }
  }

  // 复杂类型：select 或 multi_select
  if (typeof paramType === 'object' && 'select' in paramType) {
    return (
      <Select
        style={{ width: '100%' }}
        placeholder={`请选择${param.label}`}
        options={getSelectOptions(paramType)}
      />
    );
  }

  if (typeof paramType === 'object' && 'multi_select' in paramType) {
    return (
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder={`请选择${param.label}`}
        options={getSelectOptions(paramType)}
      />
    );
  }

  return <Input placeholder={`请输入${param.label}`} />;
};

/**
 * 执行脚本弹窗
 */
const ExecuteScriptModal: React.FC<ExecuteScriptModalProps> = ({
  visible,
  script,
  scriptParams,
  loading,
  executing,
  result,
  onClose,
  onExecute,
}) => {
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form) ?? {};

  /**
   * 打开文件/目录选择对话框
   */
  const handleOpenFileDialog = useCallback(async (
    fieldName: string,
    isDirectory: boolean
  ) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: isDirectory,
        multiple: false,
        title: isDirectory ? '选择目录' : '选择文件',
      });

      if (selected) {
        form.setFieldValue(fieldName, selected);
      }
    } catch (error) {
      console.error('打开文件对话框失败:', error);
    }
  }, [form]);

  /**
   * 渲染动态表单
   */
  const renderDynamicForm = useCallback(() => {
    const visibleParams = scriptParams.filter((param) =>
      shouldShowParam(param, formValues as Record<string, unknown>)
    );

    return (
      <Row gutter={16}>
        {visibleParams.map((param) => (
          <Col span={12} key={param.name}>
            <Form.Item
              name={param.name}
              label={param.label}
              rules={[
                {
                  required: param.required,
                  message: `请输入${param.label}`,
                },
              ]}
              extra={param.description}
            >
              <ParamInputRenderer
                param={param}
                onOpenFileDialog={handleOpenFileDialog}
              />
            </Form.Item>
          </Col>
        ))}
      </Row>
    );
  }, [scriptParams, formValues, handleOpenFileDialog]);

  return (
    <Modal
      title={`执行脚本: ${script?.name}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="execute"
          type="primary"
          loading={executing}
          onClick={onExecute}
        >
          执行
        </Button>,
      ]}
      width={700}
    >
      {loading ? (
        <Spin />
      ) : (
        <>
          <Form form={form} layout="vertical">
            {renderDynamicForm()}
          </Form>

          {result && (
            <Card
              title="执行结果"
              size="small"
              style={{ marginTop: 16 }}
            >
              {result.success ? (
                <Alert
                  message="执行成功"
                  description={result.output}
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message="执行失败"
                  description={result.error}
                  type="error"
                  showIcon
                />
              )}
            </Card>
          )}
        </>
      )}
    </Modal>
  );
};

export default ExecuteScriptModal;
