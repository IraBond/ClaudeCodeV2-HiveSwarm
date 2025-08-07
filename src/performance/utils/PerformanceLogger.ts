/**
 * Performance Logger
 * Specialized logging for performance analysis operations
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  memoryUsage?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number; // bytes
  maxFiles?: number;
  enableMetrics: boolean;
}

export class PerformanceLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logCounts: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 0,
    [LogLevel.WARN]: 0,
    [LogLevel.ERROR]: 0,
    [LogLevel.CRITICAL]: 0
  };

  private readonly LOG_LEVEL_ORDER = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.CRITICAL]: 4
  };

  constructor(config: LoggerConfig) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Debug level logging
   */
  debug(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, component, message, metadata);
  }

  /**
   * Info level logging
   */
  info(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, component, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, component, message, metadata);
  }

  /**
   * Error level logging
   */
  error(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, component, message, metadata);
  }

  /**
   * Critical level logging
   */
  critical(component: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, component, message, metadata);
  }

  /**
   * Performance timing utility
   */
  time<T>(component: string, operation: string, fn: () => Promise<T>): Promise<T>;
  time<T>(component: string, operation: string, fn: () => T): T;
  time<T>(component: string, operation: string, fn: () => T | Promise<T>): T | Promise<T> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    const logCompletion = (duration: number, error?: Error) => {
      const endMemory = this.getMemoryUsage();
      const memoryDelta = endMemory - startMemory;

      this.log(
        error ? LogLevel.ERROR : LogLevel.DEBUG,
        component,
        `${operation} ${error ? 'failed' : 'completed'}`,
        {
          operation,
          duration,
          memoryUsage: endMemory,
          memoryDelta,
          error: error?.message
        },
        duration
      );
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then(value => {
            logCompletion(Date.now() - startTime);
            return value;
          })
          .catch(error => {
            logCompletion(Date.now() - startTime, error);
            throw error;
          });
      } else {
        logCompletion(Date.now() - startTime);
        return result;
      }
    } catch (error) {
      logCompletion(Date.now() - startTime, error as Error);
      throw error;
    }
  }

  /**
   * Log performance metrics
   */
  logMetrics(component: string, metrics: Record<string, number>): void {
    if (!this.config.enableMetrics) return;

    this.log(LogLevel.INFO, component, 'Performance metrics', {
      metrics,
      type: 'performance_metrics'
    });
  }

  /**
   * Log analysis results
   */
  logAnalysisResult(component: string, analysisId: string, duration: number, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, component, `Analysis completed: ${analysisId}`, {
      analysisId,
      duration,
      type: 'analysis_result',
      ...metadata
    }, duration);
  }

  /**
   * Log bottleneck detection
   */
  logBottleneckDetected(
    component: string,
    bottleneckType: string,
    severity: string,
    description: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.WARN, component, `Bottleneck detected: ${bottleneckType}`, {
      bottleneckType,
      severity,
      description,
      type: 'bottleneck_detection',
      ...metadata
    });
  }

  /**
   * Log resource usage
   */
  logResourceUsage(component: string, resourceType: string, usage: number, threshold?: number): void {
    const level = threshold && usage > threshold ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, component, `Resource usage: ${resourceType}`, {
      resourceType,
      usage,
      threshold,
      type: 'resource_usage',
      overThreshold: threshold ? usage > threshold : false
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get logs in time range
   */
  getLogsInRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Get logging statistics
   */
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    components: string[];
    memoryUsage: number;
    oldestLog?: number;
    newestLog?: number;
  } {
    const components = Array.from(new Set(this.logs.map(log => log.component)));
    const timestamps = this.logs.map(log => log.timestamp);
    
    return {
      totalLogs: this.logs.length,
      logsByLevel: { ...this.logCounts },
      components,
      memoryUsage: this.getMemoryUsage(),
      oldestLog: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestLog: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  /**
   * Export logs to JSON
   */
  exportLogs(startTime?: number, endTime?: number): string {
    let logsToExport = this.logs;
    
    if (startTime || endTime) {
      logsToExport = this.getLogsInRange(
        startTime || 0,
        endTime || Date.now()
      );
    }

    return JSON.stringify({
      exportedAt: Date.now(),
      totalLogs: logsToExport.length,
      timeRange: {
        start: startTime,
        end: endTime
      },
      logs: logsToExport
    }, null, 2);
  }

  /**
   * Clear old logs
   */
  clearOldLogs(olderThanMs: number): number {
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    // Update counts
    this.recalculateLogCounts();
    
    return initialCount - this.logs.length;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.debug('Logger', `Log level changed to ${level}`);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    metadata?: Record<string, any>,
    duration?: number
  ): void {
    // Check if this log level should be recorded
    if (this.LOG_LEVEL_ORDER[level] < this.LOG_LEVEL_ORDER[this.config.level]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      metadata,
      duration,
      memoryUsage: this.config.enableMetrics ? this.getMemoryUsage() : undefined
    };

    // Store log entry
    this.logs.push(logEntry);
    this.logCounts[level]++;

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      const removed = this.logs.splice(0, this.logs.length - this.maxLogs);
      removed.forEach(removedLog => {
        this.logCounts[removedLog.level]--;
      });
    }

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Output to file if enabled
    if (this.config.enableFile && this.config.filePath) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;
    const message = `${prefix} ${entry.message}`;
    
    const metadataStr = entry.metadata ? 
      ` ${JSON.stringify(entry.metadata)}` : '';
    
    const durationStr = entry.duration ? 
      ` (${entry.duration}ms)` : '';

    const fullMessage = `${message}${durationStr}${metadataStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage);
        break;
      case LogLevel.INFO:
        console.info(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(fullMessage);
        break;
    }
  }

  /**
   * Output log entry to file (simplified implementation)
   */
  private outputToFile(entry: LogEntry): void {
    // In a production implementation, this would use fs.appendFile
    // with proper rotation and error handling
    try {
      const logLine = JSON.stringify(entry) + '\n';
      // Would write to file here
      // fs.appendFileSync(this.config.filePath!, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Recalculate log counts after cleanup
   */
  private recalculateLogCounts(): void {
    this.logCounts = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };

    for (const log of this.logs) {
      this.logCounts[log.level]++;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.logs = [];
    this.logCounts = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };
  }
}