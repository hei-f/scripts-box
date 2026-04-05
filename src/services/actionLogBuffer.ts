/**
 * 操作日志缓冲区
 *
 * 在内存中保存最近的操作记录，当错误发生时一起持久化
 * 类似浏览器的崩溃报告机制
 */

import { logFrontendError } from './tauri';

/**
 * 日志记录类型
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 操作类型 */
  action: string;
  /** 操作详情 */
  details?: Record<string, unknown>;
  /** 关联数据 */
  data?: unknown;
}

/**
 * 错误日志记录（包含上下文）
 */
export interface ErrorLogWithContext {
  /** 错误类型 */
  errorType: string;
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stackTrace?: string;
  /** 操作上下文（最近的操作记录） */
  context: LogEntry[];
}

/** 内存缓冲区大小（保留最近 N 条记录） */
const BUFFER_SIZE = 50;

/** 内存缓冲区 */
let logBuffer: LogEntry[] = [];

/**
 * 记录操作到内存缓冲区
 *
 * @param action - 操作类型
 * @param details - 操作详情
 * @param data - 关联数据
 */
export function logAction(
  action: string,
  details?: Record<string, unknown>,
  data?: unknown
): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    action,
    details,
    data,
  };

  // 添加到缓冲区，保持固定大小
  logBuffer.push(entry);
  if (logBuffer.length > BUFFER_SIZE) {
    logBuffer.shift();
  }

  // 开发环境下打印到控制台
  if (import.meta.env.DEV) {
    console.log(`[Action] ${action}`, details ?? '', data ?? '');
  }
}

/**
 * 记录错误并持久化（包含操作上下文）
 *
 * @param error - 错误对象或错误消息
 * @param errorType - 错误类型
 */
export function logErrorWithContext(
  error: Error | string,
  errorType: string
): void {
  const message = typeof error === 'string' ? error : error.message;
  const stackTrace = typeof error === 'string' ? undefined : error.stack;

  // 复制当前缓冲区作为上下文
  const context = [...logBuffer];

  // 打印到控制台
  console.error(`[${errorType}] ${message}`, error);
  console.error('操作上下文:', context);

  // 持久化错误日志（包含上下文）
  const contextJson = JSON.stringify(context);
  logFrontendError(errorType, message, stackTrace, contextJson).match(
    () => {
      console.log('错误日志已持久化');
    },
    (logError) => {
      console.error('无法持久化错误日志:', logError);
    }
  );
}

/**
 * 获取当前缓冲区内容（用于调试）
 */
export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

/**
 * 清空缓冲区
 */
export function clearLogBuffer(): void {
  logBuffer = [];
}

/**
 * 获取缓冲区大小
 */
export function getBufferSize(): number {
  return logBuffer.length;
}
