/**
 * 调试日志服务
 *
 * 提供统一的调试日志记录接口，同时输出到控制台和持久化存储
 */

import { writeDebugLog } from './tauri';

/**
 * 调试日志标签前缀
 */
const DEBUG_LOG_PREFIX = '[DEBUG]';

/**
 * 记录调试日志
 *
 * @param tag - 日志标签，用于分类和过滤
 * @param data - 日志数据
 */
export const debugLog = (tag: string, data: Record<string, unknown>): void => {
  console.log(`${DEBUG_LOG_PREFIX} ${tag}`, data);
  writeDebugLog(tag, data).match(
    () => {},
    (err) => console.error('写入调试日志失败:', err)
  );
};