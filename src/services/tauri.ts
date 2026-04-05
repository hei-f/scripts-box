/**
 * Tauri 命令调用封装模块
 *
 * 提供统一的 Tauri invoke 包装函数，使用 neverthrow 的 ResultAsync
 * 实现类型安全的错误处理
 */

import { invoke } from '@tauri-apps/api/core';
import { ResultAsync } from 'neverthrow';
import type {
  ScriptConfig,
  ScriptInfo,
  ParamDefinition,
  ScriptResult,
  ExecutionRecord,
  AppConfig,
  WindowConfig,
  ShortcutConfig,
  TrayConfig,
  Workflow,
  WorkflowInfo,
  WorkflowResult,
  OutputDefinition,
} from '../types';

/**
 * 通用的 Tauri invoke 包装函数
 *
 * 使用 ResultAsync.fromPromise 包装 Tauri invoke 调用，
 * 提供类型安全的错误处理和用户友好的错误消息
 *
 * @template T - 返回值类型
 * @param cmd - Tauri 命令名称
 * @param args - 命令参数（可选）
 * @returns ResultAsync<T, string> - 成功返回 T，失败返回错误消息字符串
 */
function invokeTauri<T>(
  cmd: string,
  args?: Record<string, unknown>
): ResultAsync<T, string> {
  return ResultAsync.fromPromise(
    invoke<T>(cmd, args),
    (error: unknown): string => {
      // 将原始错误转换为用户友好的错误消息
      if (error instanceof Error) {
        return error.message;
      }

      if (typeof error === 'string') {
        return error;
      }

      // 处理 Tauri 返回的错误对象
      if (typeof error === 'object' && error !== null) {
        // 尝试提取常见的错误字段
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.message === 'string') {
          return errorObj.message;
        }
        if (typeof errorObj.error === 'string') {
          return errorObj.error;
        }
        // 如果是 AppError 的序列化形式
        if (errorObj.type === 'ConfigError' && typeof errorObj.message === 'string') {
          return `配置错误: ${errorObj.message}`;
        }
        if (errorObj.type === 'DatabaseError' && typeof errorObj.message === 'string') {
          return `数据库错误: ${errorObj.message}`;
        }
        if (errorObj.type === 'ScriptError' && typeof errorObj.message === 'string') {
          return `脚本错误: ${errorObj.message}`;
        }
        if (errorObj.type === 'NotFoundError' && typeof errorObj.message === 'string') {
          return `资源未找到: ${errorObj.message}`;
        }
        if (errorObj.type === 'ValidationError' && typeof errorObj.message === 'string') {
          return `参数验证失败: ${errorObj.message}`;
        }
        if (errorObj.type === 'IoError' && typeof errorObj.message === 'string') {
          return `IO 错误: ${errorObj.message}`;
        }
      }

      return `调用命令 ${cmd} 时发生未知错误`;
    }
  );
}

// ==================== 脚本配置相关命令 ====================

/**
 * 列出所有脚本配置
 *
 * @returns ResultAsync<ScriptConfig[], string> - 成功返回脚本配置列表
 */
export function listScriptConfigs(): ResultAsync<ScriptConfig[], string> {
  return invokeTauri<ScriptConfig[]>('list_script_configs');
}

/**
 * 获取单个脚本配置
 *
 * @param id - 脚本 ID
 * @returns ResultAsync<ScriptConfig, string> - 成功返回脚本配置
 */
export function getScriptConfig(id: string): ResultAsync<ScriptConfig, string> {
  return invokeTauri<ScriptConfig>('get_script_config', { id });
}

/**
 * 创建脚本配置
 *
 * @param config - 要创建的脚本配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function createScriptConfig(config: ScriptConfig): ResultAsync<void, string> {
  return invokeTauri<void>('create_script_config', { config });
}

/**
 * 更新脚本配置
 *
 * @param id - 要更新的脚本 ID
 * @param config - 新的脚本配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateScriptConfig(
  id: string,
  config: ScriptConfig
): ResultAsync<void, string> {
  return invokeTauri<void>('update_script_config', { id, config });
}

/**
 * 删除脚本配置
 *
 * @param id - 要删除的脚本 ID
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function deleteScriptConfig(id: string): ResultAsync<void, string> {
  return invokeTauri<void>('delete_script_config', { id });
}

// ==================== 脚本执行相关命令 ====================

/**
 * 列出所有脚本元信息
 *
 * @returns ResultAsync<ScriptInfo[], string> - 成功返回脚本元信息列表
 */
export function listScripts(): ResultAsync<ScriptInfo[], string> {
  return invokeTauri<ScriptInfo[]>('list_scripts');
}

/**
 * 获取脚本参数定义
 *
 * @param id - 脚本 ID
 * @returns ResultAsync<ParamDefinition[], string> - 成功返回参数定义列表
 */
export function getScriptParams(id: string): ResultAsync<ParamDefinition[], string> {
  return invokeTauri<ParamDefinition[]>('get_script_params', { id });
}

/**
 * 执行脚本
 *
 * @param id - 脚本 ID
 * @param params - 脚本参数（Record 类型，用于 JSON 序列化）
 * @returns ResultAsync<ScriptResult, string> - 成功返回脚本执行结果
 */
export function executeScript(
  id: string,
  params: Record<string, unknown>
): ResultAsync<ScriptResult, string> {
  return invokeTauri<ScriptResult>('execute_script', { id, params });
}

// ==================== 执行历史相关命令 ====================

/**
 * 查询执行历史
 *
 * @param scriptId - 可选的脚本 ID，用于过滤特定脚本的执行历史
 * @param limit - 返回记录数量限制，默认为 100
 * @returns ResultAsync<ExecutionRecord[], string> - 成功返回执行记录列表
 */
export function listExecutionHistory(
  scriptId?: string,
  limit?: number
): ResultAsync<ExecutionRecord[], string> {
  return invokeTauri<ExecutionRecord[]>('list_execution_history', { scriptId, limit });
}

/**
 * 删除执行历史记录
 *
 * @param id - 记录 ID
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function deleteExecutionHistory(id: number): ResultAsync<void, string> {
  return invokeTauri<void>('delete_execution_history', { id });
}

/**
 * 清空执行历史
 *
 * @param scriptId - 可选的脚本 ID，如果提供则只清空该脚本的执行历史
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function clearExecutionHistory(scriptId?: string): ResultAsync<void, string> {
  return invokeTauri<void>('clear_execution_history', { scriptId });
}

// ==================== 应用配置相关命令 ====================

/**
 * 获取应用配置
 *
 * @returns ResultAsync<AppConfig, string> - 成功返回应用配置
 */
export function getAppConfig(): ResultAsync<AppConfig, string> {
  return invokeTauri<AppConfig>('get_app_config');
}

/**
 * 更新应用配置
 *
 * @param config - 新的应用配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateAppConfig(config: AppConfig): ResultAsync<void, string> {
  return invokeTauri<void>('update_app_config', { config });
}

/**
 * 更新窗口配置
 *
 * @param config - 新的窗口配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateWindowConfig(config: WindowConfig): ResultAsync<void, string> {
  return invokeTauri<void>('update_window_config', { config });
}

/**
 * 更新快捷键配置
 *
 * @param config - 新的快捷键配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateShortcutConfig(config: ShortcutConfig): ResultAsync<void, string> {
  return invokeTauri<void>('update_shortcut_config', { config });
}

/**
 * 更新托盘配置
 *
 * @param config - 新的托盘配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateTrayConfig(config: TrayConfig): ResultAsync<void, string> {
  return invokeTauri<void>('update_tray_config', { config });
}

// ==================== 错误日志相关命令 ====================

/**
 * 错误日志记录类型
 */
export interface ErrorLog {
  id?: number;
  source: string;
  errorType: string;
  message: string;
  stackTrace?: string;
  context?: string;
  createdAt: number;
}

/**
 * 记录前端错误日志
 *
 * @param errorType - 错误类型
 * @param message - 错误消息
 * @param stackTrace - 错误堆栈（可选）
 * @param context - 上下文信息（可选）
 * @returns ResultAsync<number, string> - 成功返回记录 ID
 */
export function logFrontendError(
  errorType: string,
  message: string,
  stackTrace?: string,
  context?: string
): ResultAsync<number, string> {
  return invokeTauri<number>('log_frontend_error', {
    errorType,
    message,
    stackTrace,
    context,
  });
}

/**
 * 获取错误日志列表
 *
 * @param limit - 返回记录数量限制，默认 100
 * @returns ResultAsync<ErrorLog[], string> - 成功返回错误日志列表
 */
export function listErrorLogs(limit?: number): ResultAsync<ErrorLog[], string> {
  return invokeTauri<ErrorLog[]>('list_error_logs', { limit });
}

/**
 * 清空错误日志
 *
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function clearErrorLogs(): ResultAsync<void, string> {
  return invokeTauri<void>('clear_error_logs');
}

/**
 * 清理过期的错误日志
 *
 * @param daysToKeep - 保留天数，默认 7 天
 * @returns ResultAsync<number, string> - 成功返回删除的记录数
 */
export function cleanupOldErrorLogs(
  daysToKeep?: number
): ResultAsync<number, string> {
  return invokeTauri<number>('cleanup_old_error_logs', { daysToKeep });
}

/**
 * 写入调试日志到本地文件
 *
 * 日志文件位于应用配置目录下的 debug.log
 *
 * @param tag - 日志标签
 * @param data - 日志数据对象
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function writeDebugLog(
  tag: string,
  data: Record<string, unknown>
): ResultAsync<void, string> {
  return invokeTauri<void>('write_debug_log', { tag, data: JSON.stringify(data) });
}

/**
 * 清空调试日志文件
 *
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function clearDebugLog(): ResultAsync<void, string> {
  return invokeTauri<void>('clear_debug_log');
}

/**
 * 读取调试日志文件内容
 *
 * @returns ResultAsync<string, string> - 成功返回日志内容
 */
export function readDebugLog(): ResultAsync<string, string> {
  return invokeTauri<string>('read_debug_log');
}

/**
 * 打开开发者工具窗口
 *
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function openDevtoolsWindow(): ResultAsync<void, string> {
  return invokeTauri<void>('open_devtools_window');
}

/**
 * 发送实时日志事件到开发者工具窗口
 *
 * @param tag - 日志标签
 * @param data - 日志数据对象
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function emitDevtoolsLog(
  tag: string,
  data: Record<string, unknown>
): ResultAsync<void, string> {
  return invokeTauri<void>('emit_devtools_log', { tag, data: JSON.stringify(data) });
}

// ==================== 工作流相关命令 ====================

/**
 * 创建工作流
 *
 * @param workflow - 要创建的工作流配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function createWorkflow(workflow: Workflow): ResultAsync<void, string> {
  return invokeTauri('create_workflow', { workflow });
}

/**
 * 获取工作流
 *
 * @param id - 工作流 ID
 * @returns ResultAsync<Workflow, string> - 成功返回工作流配置
 */
export function getWorkflow(id: string): ResultAsync<Workflow, string> {
  return invokeTauri('get_workflow', { id });
}

/**
 * 列出所有工作流元信息
 *
 * @returns ResultAsync<WorkflowInfo[], string> - 成功返回工作流元信息列表
 */
export function listWorkflows(): ResultAsync<WorkflowInfo[], string> {
  return invokeTauri('list_workflows');
}

/**
 * 更新工作流
 *
 * @param workflow - 要更新的工作流配置
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function updateWorkflow(workflow: Workflow): ResultAsync<void, string> {
  return invokeTauri('update_workflow', { workflow });
}

/**
 * 删除工作流
 *
 * @param id - 要删除的工作流 ID
 * @returns ResultAsync<void, string> - 成功返回 void
 */
export function deleteWorkflow(id: string): ResultAsync<void, string> {
  return invokeTauri('delete_workflow', { id });
}

/**
 * 执行工作流
 *
 * @param id - 工作流 ID
 * @param params - 工作流参数
 * @returns ResultAsync<WorkflowResult, string> - 成功返回工作流执行结果
 */
export function executeWorkflow(id: string, params: Record<string, unknown>): ResultAsync<WorkflowResult, string> {
  return invokeTauri('execute_workflow', { id, params });
}

/**
 * 获取脚本输出定义
 *
 * @param id - 脚本 ID
 * @returns ResultAsync<OutputDefinition[], string> - 成功返回输出定义列表
 */
export function getScriptOutputSchema(id: string): ResultAsync<OutputDefinition[], string> {
  return invokeTauri('get_script_output_schema', { id });
}
