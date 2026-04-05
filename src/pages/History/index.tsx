/**
 * 执行历史页面
 *
 * 展示脚本执行历史记录
 * 使用 ProTable 展示历史记录，支持详情弹窗和清空历史功能
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Typography,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Descriptions,
  Popconfirm,
  Alert,
} from 'antd';
import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  EyeOutlined,
  DeleteOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  listExecutionHistory,
  deleteExecutionHistory,
  clearExecutionHistory,
} from '../../services/tauri';
import type { ExecutionRecord } from '../../types';

const { Title } = Typography;

/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * 格式化执行时长
 */
const formatDuration = (durationMs?: number): string => {
  if (!durationMs) return '-';

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  const seconds = Math.floor(durationMs / 1000);
  const ms = durationMs % 1000;

  if (seconds < 60) {
    return `${seconds}.${ms} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes} m ${remainingSeconds} s`;
};

/**
 * 执行历史页面组件
 *
 * 功能：
 * - 使用 ProTable 展示历史记录
 * - 实现详情弹窗：展示完整参数 JSON、输出内容、错误信息
 * - 实现清空历史功能
 */
const HistoryPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExecutionRecord | null>(null);
  const [clearLoading, setClearLoading] = useState(false);

  /**
   * 加载执行历史
   */
  const loadHistory = useCallback(async (_params: Record<string, unknown>) => {
    const result = await listExecutionHistory(undefined, 100);

    return result.match(
      (records) => ({
        data: records,
        success: true,
        total: records.length,
      }),
      (error) => {
        message.error(`加载执行历史失败: ${error}`);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    );
  }, []);

  /**
   * 显示详情弹窗
   */
  const showDetail = useCallback((record: ExecutionRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  }, []);

  /**
   * 删除单条记录
   */
  const handleDelete = useCallback(
    async (id: number) => {
      const result = await deleteExecutionHistory(id);

      result.match(
        () => {
          message.success('删除记录成功');
          actionRef.current?.reload();
        },
        (error) => {
          message.error(`删除记录失败: ${error}`);
        }
      );
    },
    []
  );

  /**
   * 清空所有历史
   */
  const handleClearAll = useCallback(async () => {
    setClearLoading(true);

    const result = await clearExecutionHistory();

    result.match(
      () => {
        message.success('清空执行历史成功');
        actionRef.current?.reload();
      },
      (error) => {
        message.error(`清空执行历史失败: ${error}`);
      }
    );

    setClearLoading(false);
  }, []);

  /**
   * 格式化 JSON 字符串
   */
  const formatJson = (jsonString: string): string => {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  /**
   * 表格列定义
   */
  const columns: ProColumns<ExecutionRecord>[] = [
    {
      title: '记录 ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      search: false,
    },
    {
      title: '脚本 ID',
      dataIndex: 'scriptId',
      key: 'scriptId',
      width: 200,
      copyable: true,
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag
          icon={record.status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={record.status === 'success' ? 'success' : 'error'}
        >
          {record.status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '执行时间',
      dataIndex: 'executedAt',
      key: 'executedAt',
      width: 180,
      render: (_, record) => formatTimestamp(record.executedAt),
      search: false,
    },
    {
      title: '执行时长',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 120,
      render: (_, record) => formatDuration(record.durationMs),
      search: false,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      search: false,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条执行记录吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>执行历史</Title>
      <ProTable<ExecutionRecord>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => loadHistory(params)}
        rowKey="id"
        search={false}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
        toolBarRender={() => [
          <Popconfirm
            key="clear"
            title="确认清空"
            description="确定要清空所有执行历史吗？此操作不可撤销。"
            onConfirm={handleClearAll}
            okText="确认"
            cancelText="取消"
          >
            <Button
              danger
              icon={<ClearOutlined />}
              loading={clearLoading}
            >
              清空历史
            </Button>
          </Popconfirm>,
        ]}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="执行详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedRecord(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="记录 ID" span={1}>
              {selectedRecord.id}
            </Descriptions.Item>
            <Descriptions.Item label="脚本 ID" span={1}>
              {selectedRecord.scriptId}
            </Descriptions.Item>
            <Descriptions.Item label="执行状态" span={1}>
              <Tag
                icon={
                  selectedRecord.status === 'success' ? (
                    <CheckCircleOutlined />
                  ) : (
                    <CloseCircleOutlined />
                  )
                }
                color={selectedRecord.status === 'success' ? 'success' : 'error'}
              >
                {selectedRecord.status === 'success' ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="执行时长" span={1}>
              {formatDuration(selectedRecord.durationMs)}
            </Descriptions.Item>
            <Descriptions.Item label="执行时间" span={2}>
              {formatTimestamp(selectedRecord.executedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="执行参数" span={2}>
              <pre
                style={{
                  margin: 0,
                  padding: 8,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {formatJson(selectedRecord.params)}
              </pre>
            </Descriptions.Item>
            {selectedRecord.output && (
              <Descriptions.Item label="输出内容" span={2}>
                <pre
                  style={{
                    margin: 0,
                    padding: 8,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedRecord.output}
                </pre>
              </Descriptions.Item>
            )}
            {selectedRecord.error && (
              <Descriptions.Item label="错误信息" span={2}>
                <Alert
                  message={selectedRecord.error}
                  type="error"
                  showIcon
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
