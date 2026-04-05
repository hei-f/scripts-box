/**
 * 调试面板组件
 *
 * 显示前后端的关键调试信息，帮助诊断问题
 */

import React, { useEffect, useState } from 'react';
import { Card, Typography, Collapse, theme, Button, Empty, Space, Spin } from 'antd';
import { BugOutlined, ClearOutlined, ReloadOutlined } from '@ant-design/icons';
import { listScriptConfigs, readDebugLog, clearDebugLog } from '../../../../services/tauri';
import type { ScriptConfig } from '../../../../types';

const { Text } = Typography;
const { Panel } = Collapse;

interface DebugPanelProps {
  nodes: unknown[];
  edges: unknown[];
  scriptConfigs: ScriptConfig[];
  initialWorkflow?: unknown;
}

interface LogEntry {
  timestamp: string;
  tag: string;
  data: Record<string, unknown>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  nodes,
  edges,
  scriptConfigs,
  initialWorkflow,
}) => {
  const { token } = theme.useToken();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backendData, setBackendData] = useState<{
    scriptConfigs: ScriptConfig[] | null;
    error: string | null;
  }>({ scriptConfigs: null, error: null });

  const loadLogs = async () => {
    const result = await readDebugLog();
    result.match(
      (content) => {
        try {
          const lines = content.split('\n').filter(Boolean);
          const parsedLogs = lines.map((line) => {
            try {
              return JSON.parse(line) as LogEntry;
            } catch {
              return null;
            }
          }).filter((log): log is LogEntry => log !== null);
          setLogs(parsedLogs.slice(-50)); // 保留最后 50 条
        } catch {
          setLogs([]);
        }
      },
      () => setLogs([])
    );
  };

  const loadBackendData = async () => {
    const result = await listScriptConfigs();
    result.match(
      (configs) => setBackendData({ scriptConfigs: configs, error: null }),
      (error) => setBackendData({ scriptConfigs: null, error: String(error) })
    );
  };

  const handleClearLogs = async () => {
    await clearDebugLog();
    setLogs([]);
  };

  useEffect(() => {
    loadLogs();
    loadBackendData();
  }, []);

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BugOutlined style={{ color: token.colorWarning }} />
          <Text strong>调试面板</Text>
        </div>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => { loadLogs(); loadBackendData(); }}>
            刷新
          </Button>
          <Button size="small" icon={<ClearOutlined />} onClick={handleClearLogs}>
            清空
          </Button>
        </Space>
      }
      style={{ height: '100%', overflow: 'auto' }}
      styles={{ body: { padding: token.paddingSM, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}
    >
      <Collapse size="small" defaultActiveKey={['nodes', 'backend', 'logs']}>
        <Panel header="当前节点状态" key="nodes">
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
            <Text type="secondary">节点数量: </Text>
            <Text>{nodes.length}</Text>
            <br />
            <Text type="secondary">边数量: </Text>
            <Text>{edges.length}</Text>
            <br />
            <Text type="secondary">脚本配置数量: </Text>
            <Text>{scriptConfigs.length}</Text>
            <br />
            <Text type="secondary">节点详情:</Text>
            <pre style={{ fontSize: 10, maxHeight: 150, overflow: 'auto', background: token.colorBgLayout, padding: 8 }}>
              {JSON.stringify(nodes, null, 2)}
            </pre>
          </div>
        </Panel>

        <Panel header="后端数据 (listScriptConfigs)" key="backend">
          {backendData.error ? (
            <Text type="danger">{backendData.error}</Text>
          ) : backendData.scriptConfigs ? (
            <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
              <Text type="secondary">脚本数量: </Text>
              <Text>{backendData.scriptConfigs.length}</Text>
              {backendData.scriptConfigs.map((script, index) => (
                <div key={script.id} style={{ marginTop: 8, padding: 8, background: token.colorBgLayout }}>
                  <Text strong>{index + 1}. {script.name} ({script.id})</Text>
                  <br />
                  <Text type="secondary">params: </Text>
                  <Text>{script.params?.length ?? 0} 个</Text>
                  {script.params && script.params.length > 0 && (
                    <pre style={{ fontSize: 10, margin: 0 }}>
                      {JSON.stringify(script.params, null, 2)}
                    </pre>
                  )}
                  <Text type="secondary">outputs: </Text>
                  <Text>{script.outputs?.length ?? 0} 个</Text>
                  {script.outputs && script.outputs.length > 0 && (
                    <pre style={{ fontSize: 10, margin: 0 }}>
                      {JSON.stringify(script.outputs, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Spin size="small" />
          )}
        </Panel>

        <Panel header="初始工作流" key="workflow">
          {initialWorkflow ? (
            <pre style={{ fontSize: 10, maxHeight: 150, overflow: 'auto', background: token.colorBgLayout, padding: 8 }}>
              {JSON.stringify(initialWorkflow, null, 2)}
            </pre>
          ) : (
            <Empty description="无初始工作流" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Panel>

        <Panel header="调试日志" key="logs">
          {logs.length > 0 ? (
            <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {logs.map((log, index) => (
                <div key={index} style={{ marginBottom: 8, padding: 4, background: token.colorBgLayout }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {log.timestamp}
                  </Text>
                  <br />
                  <Text strong style={{ color: token.colorPrimary }}>{log.tag}</Text>
                  <pre style={{ fontSize: 10, margin: 0 }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Panel>
      </Collapse>
    </Card>
  );
};

export default DebugPanel;
