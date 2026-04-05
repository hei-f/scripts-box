/**
 * 错误日志服务
 *
 * 捕获应用错误并持久化记录到后端数据库
 * 使用内存缓冲区保存操作上下文，错误发生时一起持久化
 */

import { logErrorWithContext, logAction } from './actionLogBuffer';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** JavaScript 运行时错误 */
  RUNTIME = 'RuntimeError',
  /** 网络请求错误 */
  NETWORK = 'NetworkError',
  /** API 调用错误 */
  API = 'ApiError',
  /** 组件渲染错误 */
  RENDER = 'RenderError',
  /** 用户操作错误 */
  USER = 'UserError',
  /** 未知错误 */
  UNKNOWN = 'UnknownError',
}

// 重导出操作日志函数
export { logAction } from './actionLogBuffer';

/**
 * 记录错误到持久化存储（包含操作上下文）
 *
 * @param error - 错误对象或错误消息
 * @param type - 错误类型
 */
export function logError(
  error: Error | string,
  type?: ErrorType
): void {
  logErrorWithContext(error, type ?? ErrorType.UNKNOWN);
}

/**
 * 捕获 Promise 拒绝错误
 *
 * @param error - 拒因
 */
export function logPromiseRejection(error: unknown): void {
  let message: string;
  let errorObj: Error | string;

  if (error instanceof Error) {
    message = error.message;
    errorObj = error;
  } else if (typeof error === 'string') {
    message = error;
    errorObj = error;
  } else {
    message = JSON.stringify(error);
    errorObj = message;
  }

  logErrorWithContext(errorObj, ErrorType.RUNTIME);
}

/**
 * 初始化全局错误捕获
 *
 * 设置 window.onerror 和 unhandledrejection 处理器
 */
export function initErrorCapture(): void {
  // 捕获同步错误
  window.onerror = (_message, _source, _lineno, _colno, error) => {
    logErrorWithContext(
      error ?? 'Unknown error',
      ErrorType.RUNTIME
    );

    // 返回 false 让错误继续传播
    return false;
  };

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    logPromiseRejection(event.reason);
  });

  // 捕获资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      const target = event.target as HTMLElement;
      const src = (target as HTMLImageElement).src || (target as HTMLScriptElement).src;

      logErrorWithContext(
        `资源加载失败: ${src}`,
        ErrorType.NETWORK
      );
    }
  }, true);
}

/**
 * 包装异步函数，自动记录操作和捕获错误
 *
 * @param actionName - 操作名称
 * @param fn - 异步函数
 * @returns 包装后的函数
 */
export function withActionLog<T extends unknown[], R>(
  actionName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    logAction(actionName, { args: args.length > 0 ? args : undefined });

    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      logErrorWithContext(
        error instanceof Error ? error : String(error),
        ErrorType.API
      );
      return undefined;
    }
  };
}
