/**
 * 快速执行页面
 *
 * 提供快速搜索和执行脚本的界面
 * 用于独立的快速执行窗口
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Input,
  List,
  Typography,
  Tag,
  Space,
  message,
  Spin,
  Empty,
  Form,
  Button,
  Alert,
  InputNumber,
  Select,
} from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, PlayCircleOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-dialog';
import { listScripts, getScriptParams, executeScript } from '../../services/tauri';
import type { ScriptInfo, ParamDefinition, ScriptResult, DisplayCondition } from '../../types';

const { Text, Title } = Typography;

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
 * 快速执行页面组件
 */
const QuickExecutionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<ScriptInfo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedScript, setSelectedScript] = useState<ScriptInfo | null>(null);
  const [scriptParams, setScriptParams] = useState<ParamDefinition[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ScriptResult | null>(null);
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form) ?? {};
  const searchInputRef = useRef<InputRef>(null);

  /**
   * 加载脚本列表
   */
  const loadScripts = useCallback(async () => {
    setLoading(true);
    const result = await listScripts();
    result.match(
      (data) => {
        setScripts(data);
        setFilteredScripts(data);
        setLoading(false);
      },
      (error) => {
        message.error(`加载脚本列表失败: ${error}`);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    loadScripts();
    // 自动聚焦搜索框
    searchInputRef.current?.focus();
  }, [loadScripts]);

  /**
   * 搜索过滤
   */
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredScripts(scripts);
      return;
    }
    const lowerValue = value.toLowerCase();
    const filtered = scripts.filter(
      (script) =>
        script.id.toLowerCase().includes(lowerValue) ||
        script.name.toLowerCase().includes(lowerValue) ||
        script.description.toLowerCase().includes(lowerValue)
    );
    setFilteredScripts(filtered);
  }, [scripts]);

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
   * 选择脚本
   */
  const handleSelectScript = useCallback(async (script: ScriptInfo) => {
    setSelectedScript(script);
    setLoadingParams(true);
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
   * 返回列表
   */
  const handleBack = useCallback(() => {
    setSelectedScript(null);
    setScriptParams([]);
    setExecuteResult(null);
    form.resetFields();
    searchInputRef.current?.focus();
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
            message.success('执行成功');
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
   * 渲染脚本列表
   */
  const renderScriptList = () => (
    <div style={{ padding: 16 }}>
      <Input
        ref={searchInputRef}
        placeholder="搜索脚本..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        size="large"
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <Spin />
      ) : filteredScripts.length === 0 ? (
        <Empty description="没有找到匹配的脚本" />
      ) : (
        <List
          dataSource={filteredScripts}
          renderItem={(script) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 16px' }}
              onClick={() => handleSelectScript(script)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{script.name}</Text>
                    <Tag color="blue">{script.id}</Tag>
                  </Space>
                }
                description={script.description}
              />
              <PlayCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  /**
   * 渲染脚本执行表单
   */
  const renderExecuteForm = () => {
    const visibleParams = scriptParams.filter((param) =>
      shouldShowParam(param, formValues as Record<string, unknown>)
    );

    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={handleBack} style={{ padding: 0 }}>
            ← 返回列表
          </Button>
        </div>

        <Title level={5}>{selectedScript?.name}</Title>
        <Text type="secondary">{selectedScript?.description}</Text>

        <Divider />

        {loadingParams ? (
          <Spin />
        ) : (
          <>
            <Form form={form} layout="vertical" size="small">
              {visibleParams.map((param) => (
                <Form.Item
                  key={param.name}
                  name={param.name}
                  label={param.label}
                  rules={[{ required: param.required, message: `请输入${param.label}` }]}
                  extra={param.description}
                >
                  {renderParamInput(param)}
                </Form.Item>
              ))}
            </Form>

            {executeResult && (
              <Alert
                message={executeResult.success ? '执行成功' : '执行失败'}
                description={executeResult.success ? executeResult.output : executeResult.error}
                type={executeResult.success ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={executing}
              onClick={handleExecute}
              block
            >
              执行脚本
            </Button>
          </>
        )}
      </div>
    );
  };

  // 简单的分隔线组件
  const Divider: React.FC = () => (
    <div style={{ borderBottom: '1px solid #f0f0f0', margin: '16px 0' }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {selectedScript ? renderExecuteForm() : renderScriptList()}
    </div>
  );
};

export default QuickExecutionPage;
