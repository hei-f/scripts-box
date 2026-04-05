/**
 * 设置页面
 *
 * 提供应用配置的界面，包括窗口设置、快捷键设置、托盘设置等
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Card,
  Tabs,
  Form,
  Radio,
  Switch,
  Input,
  Button,
  Space,
  message,
  Spin,
  Divider,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  getAppConfig,
  updateWindowConfig,
  updateShortcutConfig,
  updateTrayConfig,
} from '../../services/tauri';
import type { AppConfig, WindowConfig, ShortcutConfig, TrayConfig } from '../../types';
import { DEFAULT_QUICK_EXECUTION_SHORTCUT } from '../../constants';

const { Title, Text, Paragraph } = Typography;

/**
 * 设置页面组件
 */
const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [windowForm] = Form.useForm<WindowConfig>();
  const [shortcutForm] = Form.useForm<ShortcutConfig>();
  const [trayForm] = Form.useForm<TrayConfig>();

  /**
   * 加载应用配置
   */
  const loadConfig = useCallback(async () => {
    setLoading(true);
    const result = await getAppConfig();
    result.match(
      (config) => {
        setAppConfig(config);
        windowForm.setFieldsValue(config.window);
        shortcutForm.setFieldsValue(config.shortcut);
        trayForm.setFieldsValue(config.tray);
        setLoading(false);
      },
      (error) => {
        message.error(`加载配置失败: ${error}`);
        setLoading(false);
      }
    );
  }, [windowForm, shortcutForm, trayForm]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  /**
   * 保存窗口配置
   */
  const handleSaveWindowConfig = useCallback(async () => {
    try {
      const values = await windowForm.validateFields();
      setSaving(true);
      const result = await updateWindowConfig(values);
      result.match(
        () => {
          message.success('窗口配置已保存');
          setSaving(false);
        },
        (error) => {
          message.error(`保存失败: ${error}`);
          setSaving(false);
        }
      );
    } catch {
      // 表单验证失败
    }
  }, [windowForm]);

  /**
   * 保存快捷键配置
   */
  const handleSaveShortcutConfig = useCallback(async () => {
    try {
      const values = await shortcutForm.validateFields();
      setSaving(true);
      const result = await updateShortcutConfig(values);
      result.match(
        () => {
          message.success('快捷键配置已保存，重启应用后生效');
          setSaving(false);
        },
        (error) => {
          message.error(`保存失败: ${error}`);
          setSaving(false);
        }
      );
    } catch {
      // 表单验证失败
    }
  }, [shortcutForm]);

  /**
   * 保存托盘配置
   */
  const handleSaveTrayConfig = useCallback(async () => {
    try {
      const values = await trayForm.validateFields();
      setSaving(true);
      const result = await updateTrayConfig(values);
      result.match(
        () => {
          message.success('托盘配置已保存');
          setSaving(false);
        },
        (error) => {
          message.error(`保存失败: ${error}`);
          setSaving(false);
        }
      );
    } catch {
      // 表单验证失败
    }
  }, [trayForm]);

  /**
   * 重置快捷键为默认值
   */
  const handleResetShortcut = useCallback(() => {
    shortcutForm.setFieldsValue({
      quickExecution: DEFAULT_QUICK_EXECUTION_SHORTCUT,
      enabled: true,
    });
  }, [shortcutForm]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  /**
   * 窗口设置 Tab
   */
  const WindowSettingsTab = (
    <Card title="窗口设置" size="small">
      <Form form={windowForm} layout="vertical">
        <Form.Item<WindowConfig>
          name="closeBehavior"
          label="关闭按钮行为"
          tooltip="选择点击窗口关闭按钮时的行为"
        >
          <Radio.Group>
            <Radio value="minimizeToTray">最小化到托盘</Radio>
            <Radio value="quit">直接退出应用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item<WindowConfig>
          name="showOnStartup"
          label="启动时显示主窗口"
          tooltip="关闭后，应用启动时不会显示主窗口，需要从托盘打开"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveWindowConfig}
          >
            保存窗口设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  /**
   * 快捷键设置 Tab
   */
  const ShortcutSettingsTab = (
    <Card title="快捷键设置" size="small">
      <Form form={shortcutForm} layout="vertical">
        <Form.Item<ShortcutConfig>
          name="enabled"
          label="启用全局快捷键"
          tooltip="启用后，可以通过快捷键快速打开执行窗口"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item<ShortcutConfig>
          name="quickExecution"
          label="快速执行快捷键"
          tooltip="使用 CommandOrControl 前缀可自动适配 macOS/Windows"
          extra={
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
              格式示例：CommandOrControl+Shift+P（macOS: Cmd+Shift+P，Windows: Ctrl+Shift+P）
            </Paragraph>
          }
        >
          <Input placeholder={DEFAULT_QUICK_EXECUTION_SHORTCUT} />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSaveShortcutConfig}
            >
              保存快捷键设置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetShortcut}
            >
              恢复默认
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  /**
   * 托盘设置 Tab
   */
  const TraySettingsTab = (
    <Card title="托盘设置" size="small">
      <Form form={trayForm} layout="vertical">
        <Form.Item<TrayConfig>
          name="showIcon"
          label="显示托盘图标"
          tooltip="关闭后，托盘图标将不会显示"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item<TrayConfig>
          name="showInDock"
          label="在 Dock 中显示（仅 macOS）"
          tooltip="关闭后，应用图标将不会显示在 Dock 中（仅 macOS 有效）"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveTrayConfig}
          >
            保存托盘设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  // 简单的描述列表项组件
  const DescriptionItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <Text type="secondary" style={{ minWidth: 80 }}>{label}:</Text>
      <Text>{children}</Text>
    </div>
  );

  /**
   * 关于 Tab
   */
  const AboutTab = (
    <Card title="关于" size="small">
      <DescriptionItem label="应用名称">Scripts Box</DescriptionItem>
      <DescriptionItem label="版本">{appConfig?.version || '-'}</DescriptionItem>
      <DescriptionItem label="描述">一个跨平台的脚本工具箱应用</DescriptionItem>
    </Card>
  );

  const tabItems = [
    { key: 'window', label: '窗口设置', children: WindowSettingsTab },
    { key: 'shortcut', label: '快捷键设置', children: ShortcutSettingsTab },
    { key: 'tray', label: '托盘设置', children: TraySettingsTab },
    { key: 'about', label: '关于', children: AboutTab },
  ];

  return (
    <div>
      <Title level={4}>设置</Title>
      <Text type="secondary">
        配置应用的行为和快捷键
      </Text>
      <div style={{ marginTop: 16 }}>
        <Tabs items={tabItems} />
      </div>
    </div>
  );
};

export default SettingsPage;
