/**
 * 工作流列表页面
 *
 * 展示所有已创建的工作流
 * 支持新建、编辑、删除、执行工作流
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Typography,
  Button,
  Space,
  message,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listWorkflows, deleteWorkflow } from '../../services/tauri';
import type { WorkflowInfo } from '../../types';
import ExecuteModal from './ExecuteModal';

const { Title, Text } = Typography;

/**
 * 工作流列表页面组件
 */
const WorkflowListPage: React.FC = () => {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(null);

  /**
   * 加载工作流列表
   */
  const loadWorkflows = useCallback(async () => {
    const result = await listWorkflows();

    return result.match(
      (workflows) => ({
        data: workflows,
        success: true,
        total: workflows.length,
      }),
      (error) => {
        message.error(`加载工作流列表失败: ${error}`);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    );
  }, []);

  /**
   * 跳转到新建工作流页面
   */
  const handleCreate = useCallback(() => {
    navigate('/workflows/new');
  }, [navigate]);

  /**
   * 跳转到编辑工作流页面
   */
  const handleEdit = useCallback((id: string) => {
    navigate(`/workflows/${id}/edit`);
  }, [navigate]);

  /**
   * 删除工作流
   */
  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteWorkflow(id);
    result.match(
      () => {
        message.success('工作流已删除');
        actionRef.current?.reload();
      },
      (error) => {
        message.error(`删除失败: ${error}`);
      }
    );
  }, []);

  /**
   * 打开执行对话框
   */
  const openExecuteModal = useCallback((workflow: WorkflowInfo) => {
    setSelectedWorkflow(workflow);
    setExecuteModalVisible(true);
  }, []);

  /**
   * 关闭执行对话框
   */
  const closeExecuteModal = useCallback(() => {
    setExecuteModalVisible(false);
    setSelectedWorkflow(null);
  }, []);

  /**
   * 格式化时间戳
   */
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * 表格列定义
   */
  const columns: ProColumns<WorkflowInfo>[] = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (_, record) => (
        <Space>
          <Text strong>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (_, record) => record.description || <Text type="secondary">暂无描述</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (_, record) => formatTimestamp(record.createdAt),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (_, record) => formatTimestamp(record.updatedAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      search: false,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="执行工作流">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => openExecuteModal(record)}
            >
              执行
            </Button>
          </Tooltip>
          <Tooltip title="编辑工作流">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.id)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个工作流吗？此操作不可恢复。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除工作流">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>工作流管理</Title>
      <Text type="secondary">
        管理和执行可视化工作流，通过拖拽节点组合多个脚本
      </Text>
      <ProTable<WorkflowInfo>
        columns={columns}
        actionRef={actionRef}
        request={async () => loadWorkflows()}
        rowKey="id"
        search={false}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建工作流
          </Button>,
        ]}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      {/* 执行工作流对话框 */}
      {selectedWorkflow && (
        <ExecuteModal
          visible={executeModalVisible}
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          onClose={closeExecuteModal}
        />
      )}
    </div>
  );
};

export default WorkflowListPage;
