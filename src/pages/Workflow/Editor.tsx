/**
 * 工作流编辑页面
 *
 * 提供工作流编辑功能，包含：
 * - 新建模式：创建新的工作流
 * - 编辑模式：编辑现有工作流
 * - 页面布局：顶部工具栏 + WorkflowEditor 组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Button,
  Space,
  Spin,
  message,
  Result,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowEditor } from '../../components/WorkflowEditor';
import { getWorkflow } from '../../services/tauri';
import type { Workflow } from '../../types';

const { Title, Text } = Typography;

/**
 * 工作流编辑页面组件
 */
const WorkflowEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 是否为编辑模式
  const isEditMode = Boolean(id);

  // 状态管理
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | undefined>(undefined);

  /**
   * 加载工作流数据（仅编辑模式）
   */
  useEffect(() => {
    if (!isEditMode || !id) {
      setLoading(false);
      return;
    }

    const loadWorkflow = async () => {
      setLoading(true);
      setError(null);

      const result = await getWorkflow(id);
      result.match(
        (data) => {
          setWorkflow(data);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    };

    loadWorkflow();
  }, [id, isEditMode]);

  /**
   * 返回工作流列表
   */
  const handleBack = useCallback(() => {
    navigate('/workflows');
  }, [navigate]);

  /**
   * 保存成功回调
   */
  const handleSave = useCallback((savedWorkflow: Workflow) => {
    // 如果是新建模式，保存成功后跳转到编辑模式
    if (!isEditMode && savedWorkflow.id) {
      message.success('工作流创建成功');
      navigate(`/workflows/${savedWorkflow.id}/edit`, { replace: true });
    } else {
      message.success('工作流已保存');
      // 更新本地状态
      setWorkflow(savedWorkflow);
    }
  }, [isEditMode, navigate]);

  /**
   * 取消编辑
   */
  const handleCancel = useCallback(() => {
    // 显示确认对话框
    Modal.confirm({
      title: '确认离开',
      content: '确定要离开编辑页面吗？未保存的更改将会丢失。',
      okText: '确定',
      cancelText: '取消',
      onOk: handleBack,
    });
  }, [handleBack]);

  // 加载中状态
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">加载工作流数据...</Text>
        </Space>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error}
        extra={[
          <Button
            key="back"
            onClick={handleBack}
          >
            返回列表
          </Button>,
          <Button
            key="retry"
            type="primary"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {isEditMode ? '编辑工作流' : '新建工作流'}
          </Title>
          {workflow && (
            <Text type="secondary">
              {workflow.name}
            </Text>
          )}
        </Space>
      </div>

      {/* 工作流编辑器 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <WorkflowEditor
          initialWorkflow={workflow}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
