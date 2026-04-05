/**
 * 内置脚本列表页面
 *
 * 展示所有内置的脚本（注册在 Rust 后端的脚本）
 * 支持查看脚本详情和执行脚本
 */

import React, { useRef } from 'react';
import { Typography, Button, Space, Tooltip } from 'antd';
import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ScriptInfo } from './types';
import { useBuiltinScripts } from './hooks/useBuiltinScripts';
import ScriptDetailModal from './components/ScriptDetailModal';
import ExecuteScriptModal from './components/ExecuteScriptModal';

const { Title, Text } = Typography;

/**
 * 表格列定义
 */
const useColumns = (
  showScriptDetail: (script: ScriptInfo) => void,
  openExecuteModal: (script: ScriptInfo) => void
): ProColumns<ScriptInfo>[] => [
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

/**
 * 内置脚本列表页面组件
 */
const BuiltinScriptsPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const {
    selectedScript,
    scriptParams,
    loadingParams,
    executing,
    executeResult,
    detailModalVisible,
    executeModalVisible,
    loadScripts,
    showScriptDetail,
    openExecuteModal,
    handleExecute,
    closeDetailModal,
    closeExecuteModal,
  } = useBuiltinScripts();

  const columns = useColumns(showScriptDetail, openExecuteModal);

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
      <ScriptDetailModal
        visible={detailModalVisible}
        script={selectedScript}
        scriptParams={scriptParams}
        loading={loadingParams}
        onClose={closeDetailModal}
      />

      {/* 执行脚本弹窗 */}
      <ExecuteScriptModal
        visible={executeModalVisible}
        script={selectedScript}
        scriptParams={scriptParams}
        loading={loadingParams}
        executing={executing}
        result={executeResult}
        onClose={closeExecuteModal}
        onExecute={handleExecute}
      />
    </div>
  );
};

export default BuiltinScriptsPage;