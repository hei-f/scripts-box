import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  logAction,
  getLogBuffer,
  clearLogBuffer,
  getBufferSize,
  logErrorWithContext,
} from '../actionLogBuffer';
import * as tauri from '../tauri';

// Mock tauri 服务
vi.mock('../tauri', () => ({
  logFrontendError: vi.fn(),
}));

describe('actionLogBuffer', () => {
  beforeEach(() => {
    clearLogBuffer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logAction', () => {
    it('should add entry to buffer', () => {
      logAction('test_action');

      expect(getBufferSize()).toBe(1);
      const buffer = getLogBuffer();
      expect(buffer[0].action).toBe('test_action');
      expect(buffer[0].timestamp).toBeTypeOf('number');
    });

    it('should add entry with details and data', () => {
      logAction('test_action', { key: 'value' }, { data: 'test' });

      const buffer = getLogBuffer();
      expect(buffer[0].action).toBe('test_action');
      expect(buffer[0].details).toEqual({ key: 'value' });
      expect(buffer[0].data).toEqual({ data: 'test' });
    });

    it('should maintain buffer size limit', () => {
      // 添加超过缓冲区大小的记录
      for (let i = 0; i < 60; i++) {
        logAction(`action_${i}`);
      }

      // 缓冲区应该只有 50 条记录
      expect(getBufferSize()).toBe(50);

      // 最新的记录应该是最后添加的
      const buffer = getLogBuffer();
      expect(buffer[buffer.length - 1].action).toBe('action_59');
      // 最旧的记录应该是第 11 条
      expect(buffer[0].action).toBe('action_10');
    });

    it('should return copy of buffer', () => {
      logAction('test_action');
      const buffer1 = getLogBuffer();
      const buffer2 = getLogBuffer();

      expect(buffer1).not.toBe(buffer2);
      expect(buffer1).toEqual(buffer2);
    });
  });

  describe('clearLogBuffer', () => {
    it('should clear buffer', () => {
      logAction('action1');
      logAction('action2');
      expect(getBufferSize()).toBe(2);

      clearLogBuffer();

      expect(getBufferSize()).toBe(0);
      expect(getLogBuffer()).toEqual([]);
    });
  });

  describe('getBufferSize', () => {
    it('should return correct size', () => {
      expect(getBufferSize()).toBe(0);

      logAction('action1');
      expect(getBufferSize()).toBe(1);

      logAction('action2');
      expect(getBufferSize()).toBe(2);
    });
  });

  describe('logErrorWithContext', () => {
    it('should log error with string message', () => {
      const mockLogFrontendError = vi.mocked(tauri.logFrontendError);
      mockLogFrontendError.mockReturnValue({
        match: vi.fn((onSuccess) => onSuccess()),
      } as unknown as ReturnType<typeof tauri.logFrontendError>);

      logAction('action_before_error');
      logErrorWithContext('test error message', 'TestError');

      expect(mockLogFrontendError).toHaveBeenCalledWith(
        'TestError',
        'test error message',
        undefined,
        expect.stringContaining('action_before_error')
      );
    });

    it('should log error with Error object', () => {
      const mockLogFrontendError = vi.mocked(tauri.logFrontendError);
      mockLogFrontendError.mockReturnValue({
        match: vi.fn((onSuccess) => onSuccess()),
      } as unknown as ReturnType<typeof tauri.logFrontendError>);

      const error = new Error('test error');
      logAction('action_before_error');
      logErrorWithContext(error, 'RuntimeError');

      expect(mockLogFrontendError).toHaveBeenCalledWith(
        'RuntimeError',
        'test error',
        error.stack,
        expect.stringContaining('action_before_error')
      );
    });

    it('should include context in error log', () => {
      const mockLogFrontendError = vi.mocked(tauri.logFrontendError);
      mockLogFrontendError.mockReturnValue({
        match: vi.fn((onSuccess) => onSuccess()),
      } as unknown as ReturnType<typeof tauri.logFrontendError>);

      logAction('action1', { key: 'value1' });
      logAction('action2', { key: 'value2' });
      logErrorWithContext('error', 'TestError');

      const callArgs = mockLogFrontendError.mock.calls[0];
      const contextJson = callArgs[3] as string;
      const context = JSON.parse(contextJson);

      expect(context).toHaveLength(2);
      expect(context[0].action).toBe('action1');
      expect(context[1].action).toBe('action2');
    });

    it('should handle log persistence failure', () => {
      const mockLogFrontendError = vi.mocked(tauri.logFrontendError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockLogFrontendError.mockReturnValue({
        match: vi.fn((_, onError) => onError('persistence failed')),
      } as unknown as ReturnType<typeof tauri.logFrontendError>);

      logErrorWithContext('error', 'TestError');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '无法持久化错误日志:',
        'persistence failed'
      );
    });
  });
});
