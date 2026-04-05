/**
 * BuiltinScripts 页面自定义 Hook
 */

import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { listScripts, getScriptParams, executeScript } from '../../../services/tauri';
import type { ScriptInfo, ParamDefinition, ScriptResult } from '../types';

/**
 * useBuiltinScripts Hook 返回值
 */
export interface UseBuiltinScriptsResult {
  // 状态
  selectedScript: ScriptInfo | null;
  scriptParams: ParamDefinition[];
  loadingParams: boolean;
  executing: boolean;
  executeResult: ScriptResult | null;
  form: ReturnType<typeof Form.useForm>[0];
  formValues: Record<string, unknown>;
  detailModalVisible: boolean;
  executeModalVisible: boolean;

  // 方法
  loadScripts: () => Promise<{ data: ScriptInfo[]; success: boolean; total: number }>;
  showScriptDetail: (script: ScriptInfo) => Promise<void>;
  openExecuteModal: (script: ScriptInfo) => Promise<void>;
  handleExecute: () => Promise<void>;
  handleOpenFileDialog: (fieldName: string, isDirectory: boolean) => Promise<void>;
  closeDetailModal: () => void;
  closeExecuteModal: () => void;
}

/**
 * 内置脚本页面 Hook
 */
export function useBuiltinScripts(): UseBuiltinScriptsResult {
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
      const { open } = await import('@tauri-apps/plugin-dialog');
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
   * 关闭详情弹窗
   */
  const closeDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedScript(null);
    setScriptParams([]);
  }, []);

  /**
   * 关闭执行弹窗
   */
  const closeExecuteModal = useCallback(() => {
    setExecuteModalVisible(false);
    setSelectedScript(null);
    setScriptParams([]);
    setExecuteResult(null);
    form.resetFields();
  }, [form]);

  return {
    // 状态
    selectedScript,
    scriptParams,
    loadingParams,
    executing,
    executeResult,
    form,
    formValues: formValues as Record<string, unknown>,
    detailModalVisible,
    executeModalVisible,

    // 方法
    loadScripts,
    showScriptDetail,
    openExecuteModal,
    handleExecute,
    handleOpenFileDialog,
    closeDetailModal,
    closeExecuteModal,
  };
}
