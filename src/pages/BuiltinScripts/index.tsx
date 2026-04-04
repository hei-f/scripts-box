/**
 * 内置脚本列表页面
 *
 * 展示所有内置的脚本（注册在 Rust 后端的脚本）
 * 支持查看脚本详情和执行脚本
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Typography,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Tooltip,
  Card,
  Descriptions,
  Form,
  InputNumber,
  Input,
  Select,
  Spin,
  Alert,
  Row,
  Col,
} from 'antd';
import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { PlayCircleOutlined, InfoCircleOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-dialog';
import { listScripts, getScriptParams, executeScript } from '../../services/tauri';
import type { ScriptInfo, ParamDefinition, ScriptResult, DisplayCondition } from '../../types';

const { Title, Text } = Typography;

/**
 * 检查参数是否应该显示
 */
function shouldShowParam(
  param: ParamDefinition,
  formValues: Record<string, unknown>
): boolean {
  // 兼容两种字段名：showWhen (camelCase) 和 show_when (snake_case)
  const showWhen = param.showWhen || (param as unknown as { show_when?: DisplayCondition }).show_when;

  if (!showWhen) {
    return true;
  }

  const { param: dependParam, values } = showWhen;
  const dependValue = formValues[dependParam];

  if (dependValue === undefined || dependValue === null) {
    return false;
  }

  return values.includes(String(dependValue));
}

/**
 * 获取 Select 类型的选项列表
 */
function getSelectOptions(paramType: ParamDefinition['type']): { label: string; value: string }[] {
  if (typeof paramType === 'object' && paramType !== null && 'select' in paramType) {
    return paramType.select.options;
  }
  if (typeof paramType === 'object' && paramType !== null && 'multi_select' in paramType) {
    return paramType.multi_select.options;
  }
  return [];
}

/**
 * 内置脚本列表页面组件
 */
const BuiltinScriptsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptInfo | null>(null);
  const [scriptParams, setScriptParams] = useState<ParamDefinition[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ScriptResult | null>(null);
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form) ?? {};

  /**
   * 加载内置脚本列表
   */
  const loadScripts = useCallback(async () => {
    const result = await listScripts();

    return result.match(
      (scripts) => ({
        data: scripts,
        success: true,
        total: scripts.length,
      }),
      (error) => {
        message.error(`加载脚本列表失败: ${error}`);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    );
  }, []);

  /**
   * 显示脚本详情
   */
  const showScriptDetail = useCallback(async (script: ScriptInfo) => {
    setSelectedScript(script);
    setLoadingParams(true);
    setDetailModalVisible(true);

    const result = await getScriptParams(script.id);
    result.match(
      (params) => {
        setScriptParams(params);
        setLoadingParams(false);
      },
      (error) => {
        message.error(`获取脚本参数失败: ${error}`);
        setLoadingParams(false);
      }
    );
  }, []);

  /**
   * 打开执行弹窗
   */
  const openExecuteModal = useCallback(async (script: ScriptInfo) => {
    setSelectedScript(script);
    setLoadingParams(true);
    setExecuteModalVisible(true);
    setExecuteResult(null);
    form.resetFields();

    const result = await getScriptParams(script.id);
    result.match(
      (params) => {
        setScriptParams(params);
        // 设置默认值
        const defaultValues: Record<string, unknown> = {};
        params.forEach((param) => {
          if (param.default !== undefined) {
            defaultValues[param.name] = param.default;
          }
        });
        form.setFieldsValue(defaultValues);
        setLoadingParams(false);
      },
      (error) => {
        message.error(`获取脚本参数失败: ${error}`);
        setLoadingParams(false);
      }
    );
  }, [form]);

  /**
   * 执行脚本
   */
  const handleExecute = useCallback(async () => {
    if (!selectedScript) {
      return;
    }

    try {
      const values = await form.validateFields();
      setExecuting(true);

      const result = await executeScript(selectedScript.id, values);
      result.match(
        (scriptResult) => {
          setExecuteResult(scriptResult);
          setExecuting(false);
          if (scriptResult.success) {
            message.success('脚本执行成功');
          } else {
            message.error(`脚本执行失败: ${scriptResult.error}`);
          }
        },
        (error) => {
          setExecuting(false);
          message.error(`执行失败: ${error}`);
        }
      );
    } catch {
      // 表单验证失败
    }
  }, [selectedScript, form]);

  /**
   * 打开文件/目录选择对话框
   */
  const handleOpenFileDialog = useCallback(async (
    fieldName: string,
    isDirectory: boolean
  ) => {
    try {
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
   * 渲染参数输入控件
   */
  const renderParamInput = useCallback((param: ParamDefinition) => {
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
              onClick={() => handleOpenFileDialog(param.name, false)}
              suffix={(
                <Button
                  type="text"
                  size="small"
                  icon={<FileOutlined />}
                  onClick={() => handleOpenFileDialog(param.name, false)}
                />
              )}
            />
          );
        case 'directory_path':
          return (
            <Input
              placeholder="点击选择目录"
              readOnly
              onClick={() => handleOpenFileDialog(param.name, true)}
              suffix={(
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={() => handleOpenFileDialog(param.name, true)}
                />
              )}
            />
          );
        case 'text':
        default:
          return (
            <Input placeholder={`请输入${param.label}`} />
          );
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
  }, [handleOpenFileDialog]);

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
              {renderParamInput(param)}
            </Form.Item>
          </Col>
        ))}
      </Row>
    );
  }, [scriptParams, formValues, renderParamInput]);

  /**
   * 表格列定义
   */
  const columns: ProColumns<ScriptInfo>[] = [
    {
      title: '脚本 ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      copyable: true,
    },
    {
      title: '脚本名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="执行脚本">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => openExecuteModal(record)}
            >
              执行
            </Button>
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => showScriptDetail(record)}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>内置脚本</Title>
      <Text type="secondary">
        以下是从 Rust 后端注册的内置脚本，可以直接执行
      </Text>
      <ProTable<ScriptInfo>
        columns={columns}
        actionRef={actionRef}
        request={async () => loadScripts()}
        rowKey="id"
        search={false}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      {/* 脚本详情弹窗 */}
      <Modal
        title={`脚本详情: ${selectedScript?.name}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedScript(null);
          setScriptParams([]);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedScript(null);
              setScriptParams([]);
            }}
          >
            关闭
          </Button>,
        ]}
        width={600}
      >
        {loadingParams ? (
          <Spin />
        ) : (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">{selectedScript?.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{selectedScript?.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedScript?.description}</Descriptions.Item>
            <Descriptions.Item label="参数数量">
              {scriptParams.length > 0 ? scriptParams.length : '无参数'}
            </Descriptions.Item>
            {scriptParams.length > 0 && (
              <Descriptions.Item label="参数定义">
                {scriptParams.map((param) => (
                  <div key={param.name} style={{ marginBottom: 8 }}>
                    <Tag color="blue">{param.name}</Tag>
                    <Text>{param.label}</Text>
                    {param.required && <Tag color="red">必填</Tag>}
                    {param.description && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        ({param.description})
                      </Text>
                    )}
                  </div>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 执行脚本弹窗 */}
      <Modal
        title={`执行脚本: ${selectedScript?.name}`}
        open={executeModalVisible}
        onCancel={() => {
          setExecuteModalVisible(false);
          setSelectedScript(null);
          setScriptParams([]);
          setExecuteResult(null);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setExecuteModalVisible(false);
              setSelectedScript(null);
              setScriptParams([]);
              setExecuteResult(null);
              form.resetFields();
            }}
          >
            关闭
          </Button>,
          <Button
            key="execute"
            type="primary"
            loading={executing}
            onClick={handleExecute}
          >
            执行
          </Button>,
        ]}
        width={700}
      >
        {loadingParams ? (
          <Spin />
        ) : (
          <>
            <Form form={form} layout="vertical">
              {renderDynamicForm()}
            </Form>

            {executeResult && (
              <Card
                title="执行结果"
                size="small"
                style={{ marginTop: 16 }}
              >
                {executeResult.success ? (
                  <Alert
                    message="执行成功"
                    description={executeResult.output}
                    type="success"
                    showIcon
                  />
                ) : (
                  <Alert
                    message="执行失败"
                    description={executeResult.error}
                    type="error"
                    showIcon
                  />
                )}
              </Card>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default BuiltinScriptsPage;
