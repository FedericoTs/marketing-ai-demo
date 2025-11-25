/**
 * Logging Utility Tests
 *
 * Tests for structured logging utility
 * Phase 3 - Logging Utility
 */

// Set environment variables before importing module
process.env.NODE_ENV = 'test'; // This will disable logging by default
process.env.NEXT_PUBLIC_LOGGING_ENABLED = 'true'; // Override for tests
process.env.NEXT_PUBLIC_LOG_LEVEL = 'DEBUG'; // Show all logs in tests
process.env.NEXT_PUBLIC_LOG_CONTEXT = 'true';

import {
  createLogger,
  logger,
  debug,
  info,
  warn,
  error,
  LogLevel,
} from '../logger';

// Mock console methods
const originalConsoleDebug = console.debug;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.debug = originalConsoleDebug;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Logging Utility', () => {
  describe('Logger Class', () => {
    it('should create logger instance', () => {
      const testLogger = createLogger('TestLogger');
      expect(testLogger).toBeDefined();
    });

    it('should create logger without namespace', () => {
      const testLogger = createLogger();
      expect(testLogger).toBeDefined();
    });

    it('should log debug messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.debug('Debug message');

      expect(console.debug).toHaveBeenCalled();
      const logOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Debug message');
      expect(logOutput).toContain('[DEBUG]');
    });

    it('should log info messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Info message');

      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Info message');
      expect(logOutput).toContain('[INFO]');
    });

    it('should log warn messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.warn('Warning message');

      expect(console.warn).toHaveBeenCalled();
      const logOutput = (console.warn as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Warning message');
      expect(logOutput).toContain('[WARN]');
    });

    it('should log error messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.error('Error message');

      expect(console.error).toHaveBeenCalled();
      const logOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Error message');
      expect(logOutput).toContain('[ERROR]');
    });

    it('should include namespace in log output', () => {
      const testLogger = createLogger('MyComponent');
      testLogger.info('Test message');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('[MyComponent]');
    });

    it('should include context in log output', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Test message', {
        userId: 'user_123',
        action: 'test',
      });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('user_123');
      expect(logOutput).toContain('action');
      expect(logOutput).toContain('test');
    });

    it('should include timestamp in log output', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Test message');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      // Timestamp format: HH:MM:SS.mmm
      expect(logOutput).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      const parentLogger = createLogger('ParentLogger');
      const childLogger = parentLogger.child({
        userId: 'user_456',
      });

      childLogger.info('Child log');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('user_456');
    });

    it('should merge parent and child context', () => {
      const parentLogger = createLogger('ParentLogger');
      const childLogger = parentLogger.child({
        userId: 'user_456',
      });

      childLogger.info('Test', {
        action: 'test_action',
      });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('user_456');
      expect(logOutput).toContain('action');
      expect(logOutput).toContain('test_action');
    });

    it('should override parent context with child context', () => {
      const parentLogger = createLogger('ParentLogger');
      const childLogger = parentLogger.child({
        value: 'parent',
      });

      childLogger.info('Test', {
        value: 'child',
      });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      // Child context should override parent
      expect(logOutput).toContain('child');
    });
  });

  describe('Time Function', () => {
    it('should time synchronous function', async () => {
      const testLogger = createLogger('TestLogger');

      const result = await testLogger.time('syncTest', () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(console.debug).toHaveBeenCalled(); // "started" log
      expect(console.log).toHaveBeenCalled(); // "completed" log

      const completedLog = (console.log as jest.Mock).mock.calls[0][0];
      expect(completedLog).toContain('syncTest completed');
      expect(completedLog).toContain('duration');
      expect(completedLog).toMatch(/\d+ms/);
    });

    it('should time asynchronous function', async () => {
      const testLogger = createLogger('TestLogger');

      const result = await testLogger.time('asyncTest', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
      expect(console.debug).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();

      const completedLog = (console.log as jest.Mock).mock.calls[0][0];
      expect(completedLog).toContain('asyncTest completed');
      expect(completedLog).toMatch(/\d+ms/);
    });

    it('should log error when timed function throws', async () => {
      const testLogger = createLogger('TestLogger');

      await expect(
        testLogger.time('failingTest', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(console.error).toHaveBeenCalled();

      const errorLog = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorLog).toContain('failingTest failed');
      expect(errorLog).toContain('duration');
      expect(errorLog).toContain('error');
    });

    it('should include context in timed function logs', async () => {
      const testLogger = createLogger('TestLogger');

      await testLogger.time(
        'contextTest',
        () => 'result',
        { userId: 'user_789' }
      );

      const completedLog = (console.log as jest.Mock).mock.calls[0][0];
      expect(completedLog).toContain('userId');
      expect(completedLog).toContain('user_789');
    });
  });

  describe('Global Logger', () => {
    it('should have global logger instance', () => {
      expect(logger).toBeDefined();
    });

    it('should use global debug function', () => {
      debug('Global debug');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should use global info function', () => {
      info('Global info');
      expect(console.log).toHaveBeenCalled();
    });

    it('should use global warn function', () => {
      warn('Global warn');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should use global error function', () => {
      error('Global error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should accept context in global functions', () => {
      info('Global info with context', { test: 'value' });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('test');
      expect(logOutput).toContain('value');
    });
  });

  describe('Log Levels', () => {
    it('should respect log level hierarchy', () => {
      // DEBUG (0) < INFO (1) < WARN (2) < ERROR (3)
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.SILENT);
    });
  });

  describe('Context Handling', () => {
    it('should handle empty context', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Message', {});

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle undefined context', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Message', undefined);

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle complex context values', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Message', {
        nested: { key: 'value' },
        array: [1, 2, 3],
        number: 42,
        boolean: true,
      });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('nested');
      expect(logOutput).toContain('array');
      expect(logOutput).toContain('number');
      expect(logOutput).toContain('boolean');
    });

    it('should handle null values in context', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Message', {
        nullValue: null,
      });

      expect(console.log).toHaveBeenCalled();
    });

    it('should stringify object values', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Message', {
        obj: { a: 1, b: 2 },
      });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('{"a":1,"b":2}');
    });
  });

  describe('Formatting', () => {
    it('should format timestamp correctly', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Test');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      // Format: HH:MM:SS.mmm
      expect(logOutput).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('should include all log parts', () => {
      const testLogger = createLogger('MyNamespace');
      testLogger.info('My message', { key: 'value' });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/); // Timestamp
      expect(logOutput).toContain('[INFO]'); // Level
      expect(logOutput).toContain('[MyNamespace]'); // Namespace
      expect(logOutput).toContain('My message'); // Message
      expect(logOutput).toContain('key'); // Context
      expect(logOutput).toContain('value'); // Context value
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const testLogger = createLogger('TestLogger');
      const longMessage = 'x'.repeat(10000);

      testLogger.info(longMessage);

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle special characters in messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('Special chars: <>&"\'');

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle special characters in namespace', () => {
      const testLogger = createLogger('Name:With:Colons');
      testLogger.info('Test');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('[Name:With:Colons]');
    });

    it('should handle empty string message', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info('');

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle numeric messages', () => {
      const testLogger = createLogger('TestLogger');
      testLogger.info(42 as any);

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should log quickly (< 100ms for 1000 logs)', () => {
      const testLogger = createLogger('PerfTest');
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        testLogger.info(`Log message ${i}`, { iteration: i });
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
      expect(console.log).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Multiple Loggers', () => {
    it('should support multiple logger instances', () => {
      const logger1 = createLogger('Logger1');
      const logger2 = createLogger('Logger2');

      logger1.info('From logger 1');
      logger2.info('From logger 2');

      expect(console.log).toHaveBeenCalledTimes(2);

      const log1 = (console.log as jest.Mock).mock.calls[0][0];
      const log2 = (console.log as jest.Mock).mock.calls[1][0];

      expect(log1).toContain('[Logger1]');
      expect(log2).toContain('[Logger2]');
    });

    it('should not interfere between logger instances', () => {
      const logger1 = createLogger('Logger1');
      const logger2 = createLogger('Logger2');
      const child1 = logger1.child({ value: 1 });
      const child2 = logger2.child({ value: 2 });

      child1.info('Test');
      child2.info('Test');

      const log1 = (console.log as jest.Mock).mock.calls[0][0];
      const log2 = (console.log as jest.Mock).mock.calls[1][0];

      expect(log1).toContain('value');
      expect(log1).toMatch(/value[=:].*1/);
      expect(log2).toContain('value');
      expect(log2).toMatch(/value[=:].*2/);
    });
  });
});
