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