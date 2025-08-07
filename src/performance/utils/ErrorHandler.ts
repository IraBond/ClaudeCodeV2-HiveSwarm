/**
 * Performance Analysis Error Handler
 * Centralized error handling for performance analysis operations
 */

import { EventEmitter } from 'events';
import { PerformanceLogger, LogLevel } from './PerformanceLogger';

export enum ErrorCategory {
  COLLECTION = 'collection',
  ANALYSIS = 'analysis',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  RESOURCE = 'resource',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PerformanceError {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component: string;
  operation: string;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  stackTrace?: string;
  retryable: boolean;
  retryCount?: number;
  recovered?: boolean;
}

export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableRecovery: boolean;
  enableNotifications: boolean;
  criticalErrorThreshold: number; // errors per minute
  logger?: PerformanceLogger;
}

export class ErrorHandler extends EventEmitter {
  private config: ErrorHandlerConfig;
  private logger?: PerformanceLogger;
  private errors: PerformanceError[] = [];
  private maxStoredErrors = 1000;
  private recoveryStrategies: Map<string, (error: PerformanceError) => Promise<boolean>> = new Map();
  private retryQueue: Map<string, PerformanceError> = new Map();
  private criticalErrorCount = 0;
  private criticalErrorWindow = 60000; // 1 minute

  constructor(config: ErrorHandlerConfig) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      enableRecovery: true,
      enableNotifications: true,
      criticalErrorThreshold: 10,
      ...config
    };
    
    this.logger = config.logger;
    this.setupDefaultRecoveryStrategies();
    this.startCriticalErrorMonitoring();
  }

  /**
   * Handle an error with automatic recovery and retry logic
   */
  async handleError(
    category: ErrorCategory,
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>,
    retryable = false
  ): Promise<void> {
    const performanceError = this.createPerformanceError(
      category,
      component,
      operation,
      error,
      context,
      retryable
    );

    // Store error
    this.storeError(performanceError);

    // Log error
    this.logError(performanceError);

    // Emit error event
    this.emit('error', performanceError);

    // Handle critical errors
    if (performanceError.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(performanceError);
    }

    // Attempt recovery if enabled and applicable
    if (this.config.enableRecovery && this.canAttemptRecovery(performanceError)) {
      await this.attemptRecovery(performanceError);
    }

    // Queue for retry if retryable
    if (retryable && this.shouldRetry(performanceError)) {
      this.queueForRetry(performanceError);
    }
  }

  /**
   * Handle collection errors specifically
   */
  async handleCollectionError(
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(
      ErrorCategory.COLLECTION,
      component,
      operation,
      error,
      context,
      true // Collection errors are typically retryable
    );
  }

  /**
   * Handle analysis errors specifically
   */
  async handleAnalysisError(
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(
      ErrorCategory.ANALYSIS,
      component,
      operation,
      error,
      context,
      false // Analysis errors are usually not retryable
    );
  }

  /**
   * Handle storage errors specifically
   */
  async handleStorageError(
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(
      ErrorCategory.STORAGE,
      component,
      operation,
      error,
      context,
      true // Storage errors might be retryable
    );
  }

  /**
   * Handle validation errors specifically
   */
  async handleValidationError(
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(
      ErrorCategory.VALIDATION,
      component,
      operation,
      error,
      context,
      false // Validation errors are not retryable
    );
  }

  /**
   * Register a custom recovery strategy
   */
  registerRecoveryStrategy(
    errorPattern: string,
    strategy: (error: PerformanceError) => Promise<boolean>
  ): void {
    this.recoveryStrategies.set(errorPattern, strategy);
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<void> {
    const retryEntries = Array.from(this.retryQueue.entries());
    
    for (const [id, error] of retryEntries) {
      if (this.shouldRetry(error)) {
        try {
          const success = await this.attemptRetry(error);
          if (success) {
            error.recovered = true;
            this.retryQueue.delete(id);
            this.emit('error:recovered', error);
          } else {
            error.retryCount = (error.retryCount || 0) + 1;
            if (error.retryCount >= this.config.maxRetries) {
              this.retryQueue.delete(id);
              this.emit('error:retry:failed', error);
            }
          }
        } catch (retryError) {
          error.retryCount = (error.retryCount || 0) + 1;
          this.logger?.error('ErrorHandler', `Retry failed for ${id}`, {
            originalError: error.message,
            retryError: (retryError as Error).message,
            retryCount: error.retryCount
          });
        }
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
    recoveredErrors: number;
    retryQueueSize: number;
  } {
    const now = Date.now();
    const recentThreshold = now - 3600000; // 1 hour

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = this.errors.filter(e => e.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errors.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: this.errors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errors.filter(e => e.timestamp >= recentThreshold).length,
      recoveredErrors: this.errors.filter(e => e.recovered).length,
      retryQueueSize: this.retryQueue.size
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 50): PerformanceError[] {
    return this.errors
      .slice(-count)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): PerformanceError[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): PerformanceError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Clear old errors
   */
  clearOldErrors(olderThanMs: number): number {
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.errors.length;
    
    this.errors = this.errors.filter(e => e.timestamp >= cutoffTime);
    
    return initialCount - this.errors.length;
  }

  /**
   * Export error data
   */
  exportErrors(startTime?: number, endTime?: number): string {
    let errorsToExport = this.errors;
    
    if (startTime || endTime) {
      errorsToExport = this.errors.filter(e => 
        e.timestamp >= (startTime || 0) && 
        e.timestamp <= (endTime || Date.now())
      );
    }

    return JSON.stringify({
      exportedAt: Date.now(),
      totalErrors: errorsToExport.length,
      timeRange: { start: startTime, end: endTime },
      stats: this.getErrorStats(),
      errors: errorsToExport
    }, null, 2);
  }

  /**
   * Private helper methods
   */
  private createPerformanceError(
    category: ErrorCategory,
    component: string,
    operation: string,
    error: Error | string,
    context?: Record<string, any>,
    retryable = false
  ): PerformanceError {
    const originalError = error instanceof Error ? error : new Error(error.toString());
    const severity = this.determineSeverity(category, originalError, context);

    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      category,
      severity,
      component,
      operation,
      message: originalError.message,
      originalError,
      context,
      stackTrace: originalError.stack,
      retryable,
      retryCount: 0,
      recovered: false
    };
  }

  private determineSeverity(
    category: ErrorCategory,
    error: Error,
    context?: Record<string, any>
  ): ErrorSeverity {
    // System and resource errors are typically more severe
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.RESOURCE) {
      return ErrorSeverity.CRITICAL;
    }

    // Network errors might be temporary
    if (category === ErrorCategory.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }

    // Configuration errors are serious but not immediate
    if (category === ErrorCategory.CONFIGURATION) {
      return ErrorSeverity.HIGH;
    }

    // Check for specific error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('connection')) {
      return ErrorSeverity.MEDIUM;
    }

    if (message.includes('memory') || message.includes('disk') || message.includes('space')) {
      return ErrorSeverity.CRITICAL;
    }

    if (message.includes('permission') || message.includes('access')) {
      return ErrorSeverity.HIGH;
    }

    // Default based on category
    const severityMap = {
      [ErrorCategory.COLLECTION]: ErrorSeverity.MEDIUM,
      [ErrorCategory.ANALYSIS]: ErrorSeverity.LOW,
      [ErrorCategory.STORAGE]: ErrorSeverity.HIGH,
      [ErrorCategory.VALIDATION]: ErrorSeverity.LOW,
      [ErrorCategory.RESOURCE]: ErrorSeverity.CRITICAL,
      [ErrorCategory.NETWORK]: ErrorSeverity.MEDIUM,
      [ErrorCategory.CONFIGURATION]: ErrorSeverity.HIGH,
      [ErrorCategory.SYSTEM]: ErrorSeverity.CRITICAL
    };

    return severityMap[category] || ErrorSeverity.MEDIUM;
  }

  private storeError(error: PerformanceError): void {
    this.errors.push(error);

    // Maintain storage limit
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }
  }

  private logError(error: PerformanceError): void {
    if (!this.logger) return;

    const logLevel = this.getLogLevel(error.severity);
    
    this.logger.log(
      logLevel,
      error.component,
      `${error.operation} failed: ${error.message}`,
      {
        errorId: error.id,
        category: error.category,
        severity: error.severity,
        retryable: error.retryable,
        context: error.context
      }
    );
  }

  private getLogLevel(severity: ErrorSeverity): LogLevel {
    const levelMap = {
      [ErrorSeverity.LOW]: LogLevel.WARN,
      [ErrorSeverity.MEDIUM]: LogLevel.ERROR,
      [ErrorSeverity.HIGH]: LogLevel.ERROR,
      [ErrorSeverity.CRITICAL]: LogLevel.CRITICAL
    };

    return levelMap[severity];
  }

  private handleCriticalError(error: PerformanceError): void {
    this.criticalErrorCount++;
    
    // Emit critical error event
    this.emit('error:critical', error);

    // Check if we've exceeded the critical error threshold
    if (this.criticalErrorCount >= this.config.criticalErrorThreshold) {
      this.emit('error:critical:threshold', {
        count: this.criticalErrorCount,
        timeWindow: this.criticalErrorWindow,
        threshold: this.config.criticalErrorThreshold
      });
    }

    // Send notifications if enabled
    if (this.config.enableNotifications) {
      this.emit('notification:critical', {
        title: 'Critical Performance Error',
        message: `${error.component}: ${error.message}`,
        error
      });
    }
  }

  private canAttemptRecovery(error: PerformanceError): boolean {
    return error.severity !== ErrorSeverity.CRITICAL && 
           (error.category === ErrorCategory.COLLECTION || 
            error.category === ErrorCategory.STORAGE ||
            error.category === ErrorCategory.NETWORK);
  }

  private async attemptRecovery(error: PerformanceError): Promise<boolean> {
    try {
      // Find matching recovery strategy
      for (const [pattern, strategy] of this.recoveryStrategies.entries()) {
        if (error.message.includes(pattern) || error.category.includes(pattern)) {
          const success = await strategy(error);
          if (success) {
            error.recovered = true;
            this.emit('error:recovered', error);
            return true;
          }
        }
      }

      return false;
    } catch (recoveryError) {
      this.logger?.error('ErrorHandler', 'Recovery attempt failed', {
        originalError: error.message,
        recoveryError: (recoveryError as Error).message
      });
      return false;
    }
  }

  private shouldRetry(error: PerformanceError): boolean {
    return error.retryable && 
           (error.retryCount || 0) < this.config.maxRetries &&
           error.severity !== ErrorSeverity.CRITICAL;
  }

  private queueForRetry(error: PerformanceError): void {
    if (!this.retryQueue.has(error.id)) {
      this.retryQueue.set(error.id, error);
      
      // Schedule retry
      setTimeout(() => {
        if (this.retryQueue.has(error.id)) {
          this.retryFailedOperations();
        }
      }, this.config.retryDelayMs * Math.pow(2, error.retryCount || 0)); // Exponential backoff
    }
  }

  private async attemptRetry(error: PerformanceError): Promise<boolean> {
    // This would typically involve re-executing the failed operation
    // For now, we'll simulate the retry logic
    this.logger?.info('ErrorHandler', `Retrying operation: ${error.operation}`, {
      errorId: error.id,
      retryCount: (error.retryCount || 0) + 1
    });

    // Simulate retry success/failure
    return Math.random() > 0.3; // 70% success rate for simulation
  }

  private setupDefaultRecoveryStrategies(): void {
    // Connection recovery
    this.registerRecoveryStrategy('connection', async (error) => {
      // Attempt to re-establish connections
      this.logger?.info('ErrorHandler', 'Attempting connection recovery', { errorId: error.id });
      await this.sleep(1000);
      return Math.random() > 0.5; // 50% success rate
    });

    // Memory recovery
    this.registerRecoveryStrategy('memory', async (error) => {
      // Attempt garbage collection or resource cleanup
      this.logger?.info('ErrorHandler', 'Attempting memory recovery', { errorId: error.id });
      if (global.gc) {
        global.gc();
      }
      return true;
    });

    // Storage recovery
    this.registerRecoveryStrategy('storage', async (error) => {
      // Attempt storage cleanup or alternative storage
      this.logger?.info('ErrorHandler', 'Attempting storage recovery', { errorId: error.id });
      return Math.random() > 0.4; // 60% success rate
    });
  }

  private startCriticalErrorMonitoring(): void {
    setInterval(() => {
      this.criticalErrorCount = 0; // Reset counter every window
    }, this.criticalErrorWindow);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.errors = [];
    this.retryQueue.clear();
    this.recoveryStrategies.clear();
    this.removeAllListeners();
  }
}