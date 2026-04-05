/**
 * 工作流执行对话框
 *
 * 提供工作流执行功能，包含：
 * - 显示工作流入参表单
 * - 执行按钮和进度指示
 * - 显示执行结果
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Spin,
  Alert,
  Card,
  Typography,
  Collapse,
  Tag,
  Descriptions,
  Empty,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { executeWorkflow, getWorkflow } from '../../services/tauri';
import type { Workflow, WorkflowResult, ParamDefinition, NodeResult } from '../../types';

const { Text, Title } = Typography;
const { Panel } = Collapse;

/**
 * ExecuteModal 组件属性
 */
interface ExecuteModalProps {
  /** 是否显示对话框 */
  visible: boolean;
  /** 工作流 ID */
  workflowId: string;
  /** 工作流名称 */
  workflowName: string;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 工作流执行对话框组件
 */
const ExecuteModal: React.FC<ExecuteModalProps> = ({
  visible,
  workflowId,
  workflowName,
  onClose,
}) => {
  const [form] = Form.useForm();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载工作流数据
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    const loadWorkflowData = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      form.resetFields();

      const res = await getWorkflow(workflowId);
      res.match(
        (data) => {
          setWorkflow(data);
          // 设置默认值
          const defaultValues: Record<string, unknown> = {};
          data.inputSchema.forEach((param) => {
            if (param.default !== undefined) {
              defaultValues[param.name] = param.default;
            }
          });
          form.setFieldsValue(defaultValues);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    };

    loadWorkflowData();
  }, [visible, workflowId, form]);

  /**
   * 执行工作流
   */
  const handleExecute = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setExecuting(true);
      setError(null);
      setResult(null);

      const res = await executeWorkflow(workflowId, values);
      res.match(
        (data) => {
          setResult(data);
          setExecuting(false);
        },
        (err) => {
          setError(err);
          setExecuting(false);
        }
      );
    } catch {
      // 表单验证失败
    }
  }, [workflowId, form]);

  /**
   * 关闭对话框
   */
  const handleClose = useCallback(() => {
    form.resetFields();
    setResult(null);
    setError(null);
    onClose();
  }, [form, onClose]);

  /**
   * 渲染参数输入控件
   */
  const renderParamInput = (param: ParamDefinition) => {
    switch (param.type) {
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`请输入${param.label}`}
          />
        );
      case 'text':
      default:
        return (
          <Input placeholder={`请输入${param.label}`} />
        );
    }
  };

  /**
   * 格式化执行时长
   */
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * 渲染节点执行结果
   */
  const renderNodeResults = (nodeResults: Record<string, NodeResult>) => {
    const entries = Object.entries(nodeResults);
    if (entries.length === 0) {
      return <Empty description="暂无节点执行结果" />;
    }

    return (
      <Collapse
        accordion
        style={{ marginTop: 16 }}
      >
        {entries.map(([nodeId, nodeResult]) => (
          <Panel
            key={nodeId}
            header={
              <Space>
                {nodeResult.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text>节点 {nodeId}</Text>
                <Tag icon={<ClockCircleOutlined />}>
                  {formatDuration(nodeResult.durationMs)}
                </Tag>
              </Space>
            }
          >
            {nodeResult.success ? (
              <div>
                {nodeResult.outputs && (
                  <Descriptions column={1} size="small" bordered>
                    {Object.entries(nodeResult.outputs).map(([key, value]) => (
                      <Descriptions.Item key={key} label={key}>
                        <Text code>{JSON.stringify(value)}</Text>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                )}
                {nodeResult.output && (
                  <Text>{nodeResult.output}</Text>
                )}
              </div>
            ) : (
              <Alert
                message="执行失败"
                description={nodeResult.error}
                type="error"
                showIcon
              />
            )}
          </Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <Modal
      title={`执行工作流: ${workflowName}`}
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          关闭
        </Button>,
        <Button
          key="execute"
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={executing}
          onClick={handleExecute}
        >
          执行
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            加载工作流数据...
          </Text>
        </div>
      ) : error && !result ? (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
        />
      ) : (
        <>
          {/* 工作流描述 */}
          {workflow?.description && (
            <Alert
              message={workflow.description}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 输入参数表单 */}
          {workflow && workflow.inputSchema.length > 0 && (
            <Card title="输入参数" size="small" style={{ marginBottom: 16 }}>
              <Form form={form} layout="vertical">
                {workflow.inputSchema.map((param) => (
                  <Form.Item
                    key={param.name}
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
                ))}
              </Form>
            </Card>
          )}

          {/* 执行结果 */}
          {result && (
            <Card
              title="执行结果"
              size="small"
              style={{ marginTop: 16 }}
            >
              {result.success ? (
                <>
                  <Alert
                    message="工作流执行成功"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  {/* 工作流输出 */}
                  {Object.keys(result.outputs).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>输出结果</Title>
                      <Descriptions column={1} size="small" bordered>
                        {Object.entries(result.outputs).map(([key, value]) => (
                          <Descriptions.Item key={key} label={key}>
                            <Text code>{JSON.stringify(value)}</Text>
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    </div>
                  )}

                  {/* 节点执行详情 */}
                  <Title level={5}>节点执行详情</Title>
                  {renderNodeResults(result.nodeResults)}
                </>
              ) : (
                <Alert
                  message="工作流执行失败"
                  description={result.error}
                  type="error"
                  showIcon
                />
              )}
            </Card>
          )}

          {/* 执行错误 */}
          {error && result && (
            <Alert
              message="执行失败"
              description={error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default ExecuteModal;
