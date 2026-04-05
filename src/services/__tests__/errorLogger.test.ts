import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  logError,
  logPromiseRejection,
  withActionLog,
  ErrorType,
} from '../errorLogger';
import * as actionLogBuffer from '../actionLogBuffer';

// Mock actionLogBuffer
vi.mock('../actionLogBuffer', () => ({
  logErrorWithContext: vi.fn(),
  logAction: vi.fn(),
  clearLogBuffer: vi.fn(),
}));

describe('errorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logError', () => {
    it('should call logErrorWithContext with correct parameters', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);

      logError('test error');

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        'test error',
        ErrorType.UNKNOWN
      );
    });

    it('should use provided error type', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);

      logError('api error', ErrorType.API);

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        'api error',
        ErrorType.API
      );
    });

    it('should handle Error object', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);
      const error = new Error('test error');

      logError(error, ErrorType.RUNTIME);

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        error,
        ErrorType.RUNTIME
      );
    });
  });

  describe('logPromiseRejection', () => {
    it('should handle Error rejection', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);
      const error = new Error('promise error');

      logPromiseRejection(error);

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        error,
        ErrorType.RUNTIME
      );
    });

    it('should handle string rejection', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);

      logPromiseRejection('string rejection');

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        'string rejection',
        ErrorType.RUNTIME
      );
    });

    it('should handle object rejection', () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);

      logPromiseRejection({ code: 500, message: 'server error' });

      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        '{"code":500,"message":"server error"}',
        ErrorType.RUNTIME
      );
    });
  });

  describe('withActionLog', () => {
    it('should log action before execution', async () => {
      const mockLogAction = vi.mocked(actionLogBuffer.logAction);
      const mockFn = vi.fn().mockResolvedValue('result');

      const wrappedFn = withActionLog('test_action', mockFn);
      await wrappedFn();

      expect(mockLogAction).toHaveBeenCalledWith('test_action', { args: undefined });
    });

    it('should log action with arguments', async () => {
      const mockLogAction = vi.mocked(actionLogBuffer.logAction);
      const mockFn = vi.fn().mockResolvedValue('result');

      const wrappedFn = withActionLog('test_action', mockFn);
      await wrappedFn('arg1', 'arg2');

      expect(mockLogAction).toHaveBeenCalledWith('test_action', {
        args: ['arg1', 'arg2'],
      });
    });

    it('should return result on success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success result');

      const wrappedFn = withActionLog('test_action', mockFn);
      const result = await wrappedFn();

      expect(result).toBe('success result');
    });

    it('should log error and return undefined on failure', async () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);
      const error = new Error('async error');
      const mockFn = vi.fn().mockRejectedValue(error);

      const wrappedFn = withActionLog('test_action', mockFn);
      const result = await wrappedFn();

      expect(result).toBeUndefined();
      expect(mockLogErrorWithContext).toHaveBeenCalledWith(error, ErrorType.API);
    });

    it('should handle non-Error rejection', async () => {
      const mockLogErrorWithContext = vi.mocked(actionLogBuffer.logErrorWithContext);
      const mockFn = vi.fn().mockRejectedValue('string error');

      const wrappedFn = withActionLog('test_action', mockFn);
      const result = await wrappedFn();

      expect(result).toBeUndefined();
      expect(mockLogErrorWithContext).toHaveBeenCalledWith(
        'string error',
        ErrorType.API
      );
    });
  });

  describe('ErrorType', () => {
    it('should have correct error types', () => {
      expect(ErrorType.RUNTIME).toBe('RuntimeError');
      expect(ErrorType.NETWORK).toBe('NetworkError');
      expect(ErrorType.API).toBe('ApiError');
      expect(ErrorType.RENDER).toBe('RenderError');
      expect(ErrorType.USER).toBe('UserError');
      expect(ErrorType.UNKNOWN).toBe('UnknownError');
    });
  });
});
