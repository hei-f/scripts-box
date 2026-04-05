/**
 * 开发者工具页面
 *
 * 独立窗口的调试面板，类似 Chrome DevTools
 * 显示前后端的调试日志、状态信息等
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layout,
  Tabs,
  Typography,
  Button,
  Space,
  Empty,
  Spin,
  Tag,
  Input,
  theme,
  Card,
} from 'antd';
import {
  ClearOutlined,
  ReloadOutlined,
  BugOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { listen } from '@tauri-apps/api/event';
import {
  listScriptConfigs,
  readDebugLog,
  clearDebugLog,
  listWorkflows,
  listErrorLogs,
  clearErrorLogs,
} from '../../services/tauri';
import type { ScriptConfig, WorkflowInfo } from '../../types';

/** 错误日志类型 */
interface ErrorLog {
  id?: number;
  source: string;
  errorType: string;
  message: string;
  stackTrace?: string;
  context?: string;
  createdAt: number;
}

const { Content } = Layout;
const { Text, Paragraph } = Typography;

interface LogEntry {
  timestamp: string;
  tag: string;
  data: Record<string, unknown>;
}

interface RealtimeLogEvent {
  timestamp: string;
  tag: string;
  data: Record<string, unknown>;
}

const DevToolsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<ScriptConfig[] | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 加载调试日志
  const loadLogs = useCallback(async () => {
    setLoading(true);
    const result = await readDebugLog();
    result.match(
      (content) => {
        try {
          const lines = content.split('\n').filter(Boolean);
          const parsedLogs = lines
            .map((line) => {
              // 解析格式: [timestamp] [tag] data
              const match = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/);
              if (match) {
                try {
                  return {
                    timestamp: match[1],
                    tag: match[2],
                    data: JSON.parse(match[3]) as Record<string, unknown>,
                  };
                } catch {
                  return {
                    timestamp: match[1],
                    tag: match[2],
                    data: { raw: match[3] },
                  };
                }
              }
              return null;
            })
            .filter((log): log is LogEntry => log !== null);
          setLogs(parsedLogs.slice(-200)); // 保留最后 200 条
        } catch {
          setLogs([]);
        }
      },
      () => setLogs([])
    );
    setLoading(false);
  }, []);

  // 加载错误日志
  const loadErrorLogs = useCallback(async () => {
    const result = await listErrorLogs(100);
    result.match(
      (logs) => setErrorLogs(logs),
      () => setErrorLogs([])
    );
  }, []);

  // 加载后端数据
  const loadBackendData = useCallback(async () => {
    const [scriptsResult, workflowsResult] = await Promise.all([
      listScriptConfigs(),
      listWorkflows(),
    ]);
    scriptsResult.match(setScriptConfigs, () => setScriptConfigs(null));
    workflowsResult.match(setWorkflows, () => setWorkflows(null));
  }, []);

  // 清空日志
  const handleClearLogs = useCallback(async () => {
    await clearDebugLog();
    setLogs([]);
  }, []);

  // 清空错误日志
  const handleClearErrorLogs = useCallback(async () => {
    await clearErrorLogs();
    setErrorLogs([]);
  }, []);

  // 监听实时日志事件
  useEffect(() => {
    const unlisten = listen<RealtimeLogEvent>('devtools-log', (event) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.payload];
        return newLogs.slice(-200); // 保持最多 200 条
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 初始加载
  useEffect(() => {
    loadLogs();
    loadErrorLogs();
    loadBackendData();
  }, [loadLogs, loadErrorLogs, loadBackendData]);

  // 过滤日志
  const filteredLogs = logs.filter(
    (log) =>
      filter === '' ||
      log.tag.toLowerCase().includes(filter.toLowerCase()) ||
      JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase())
  );

  // 日志标签颜色
  const getTagColor = (tag: string): string => {
    if (tag.includes('error') || tag.includes('Error')) return 'error';
    if (tag.includes('warn') || tag.includes('Warning')) return 'warning';
    if (tag.includes('info')) return 'processing';
    if (tag.includes('success')) return 'success';
    return 'default';
  };

  return (
    <Layout style={{ height: '100vh', background: token.colorBgContainer }}>
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: `1px solid ${token.colorBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: token.colorBgElevated,
          }}
        >
          <Space>
            <BugOutlined style={{ color: token.colorPrimary }} />
            <Text strong>开发者工具</Text>
          </Space>
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                loadLogs();
                loadErrorLogs();
                loadBackendData();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>

        {/* 主内容区 */}
        <Tabs
          defaultActiveKey="console"
          style={{ flex: 1, overflow: 'hidden' }}
          tabBarStyle={{ paddingLeft: 16, marginBottom: 0 }}
          items={[
            {
              key: 'console',
              label: (
                <span>
                  <CodeOutlined /> 控制台
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                  {/* 控制台工具栏 */}
                  <div
                    style={{
                      padding: '8px 16px',
                      borderBottom: `1px solid ${token.colorBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Input
                      placeholder="过滤日志..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      style={{ width: 200 }}
                      size="small"
                    />
                    <Button size="small" icon={<ClearOutlined />} onClick={handleClearLogs}>
                      清空
                    </Button>
                  </div>

                  {/* 日志列表 */}
                  <div
                    style={{
                      flex: 1,
                      overflow: 'auto',
                      padding: 8,
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  >
                    {loading ? (
                      <Spin />
                    ) : filteredLogs.length > 0 ? (
                      filteredLogs.map((log, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '4px 8px',
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            background: log.tag.includes('error')
                              ? token.colorErrorBg
                              : 'transparent',
                          }}
                        >
                          <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {log.timestamp}
                            </Text>
                            <Tag color={getTagColor(log.tag)} style={{ margin: 0, fontSize: 10 }}>
                              {log.tag}
                            </Tag>
                          </Space>
                          <pre style={{ margin: '4px 0 0 0', fontSize: 11, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              ),
            },
            {
              key: 'errors',
              label: (
                <span>
                  <BugOutlined /> 错误日志 ({errorLogs.length})
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto', padding: 8 }}>
                  <div style={{ marginBottom: 8, textAlign: 'right' }}>
                    <Button size="small" icon={<ClearOutlined />} onClick={handleClearErrorLogs}>
                      清空错误日志
                    </Button>
                  </div>
                  {errorLogs.length > 0 ? (
                    errorLogs.map((log) => (
                      <Card
                        key={log.id}
                        size="small"
                        style={{ marginBottom: 8 }}
                        styles={{ body: { padding: 8 } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Tag color="error">{log.errorType}</Tag>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </Text>
                        </div>
                        <Paragraph
                          style={{ margin: '8px 0 0 0', fontSize: 12 }}
                          ellipsis={{ rows: 2, expandable: true }}
                        >
                          {log.message}
                        </Paragraph>
                        {log.stackTrace && (
                          <pre
                            style={{
                              fontSize: 10,
                              margin: '8px 0 0 0',
                              background: token.colorBgLayout,
                              padding: 4,
                              overflow: 'auto',
                            }}
                          >
                            {log.stackTrace}
                          </pre>
                        )}
                      </Card>
                    ))
                  ) : (
                    <Empty description="暂无错误日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </div>
              ),
            },
            {
              key: 'scripts',
              label: (
                <span>
                  <SettingOutlined /> 脚本配置
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto', padding: 8 }}>
                  {scriptConfigs ? (
                    scriptConfigs.map((script, index) => (
                      <Card
                        key={script.id}
                        size="small"
                        title={`${index + 1}. ${script.name}`}
                        style={{ marginBottom: 8 }}
                        styles={{ body: { padding: 8 } }}
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">ID: </Text>
                            <Text code>{script.id}</Text>
                          </div>
                          <div>
                            <Text type="secondary">参数: </Text>
                            <Text>{script.params?.length ?? 0} 个</Text>
                          </div>
                          <div>
                            <Text type="secondary">输出: </Text>
                            <Text>{script.outputs?.length ?? 0} 个</Text>
                          </div>
                          {script.outputs && script.outputs.length > 0 && (
                            <pre
                              style={{
                                fontSize: 10,
                                margin: 0,
                                background: token.colorBgLayout,
                                padding: 4,
                              }}
                            >
                              {JSON.stringify(script.outputs, null, 2)}
                            </pre>
                          )}
                        </Space>
                      </Card>
                    ))
                  ) : (
                    <Spin />
                  )}
                </div>
              ),
            },
            {
              key: 'workflows',
              label: (
                <span>
                  <DatabaseOutlined /> 工作流
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto', padding: 8 }}>
                  {workflows ? (
                    workflows.map((workflow) => (
                      <Card
                        key={workflow.id}
                        size="small"
                        title={workflow.name}
                        style={{ marginBottom: 8 }}
                        styles={{ body: { padding: 8 } }}
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">ID: </Text>
                            <Text code>{workflow.id}</Text>
                          </div>
                          <div>
                            <Text type="secondary">节点数: </Text>
                            <Text>{workflow.nodeCount ?? 'N/A'}</Text>
                          </div>
                          {workflow.description && (
                            <Text type="secondary">{workflow.description}</Text>
                          )}
                        </Space>
                      </Card>
                    ))
                  ) : (
                    <Spin />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Content>
    </Layout>
  );
};

export default DevToolsPage;
