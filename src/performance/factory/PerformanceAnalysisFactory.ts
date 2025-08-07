/**
 * Performance Analysis Factory
 * Factory for creating configured performance analysis engines
 */

import {
  PerformanceAnalysisService,
  MetricsCollector,
  StatisticalAnalyzer,
  TrendAnalyzer,
  ResourceAnalyzer,
  BottleneckDetector,
  ReportGenerator,
  PerformanceLogger,
  ErrorHandler,
  PerformanceAnalysisConfig,
  SamplingConfig,
  AnalysisConfig,
  AlertingConfig,
  StorageConfig,
  LogLevel,
  ErrorHandlerConfig
} from '../index';

export interface PerformanceEngineOptions {
  sampling?: Partial<SamplingConfig>;
  analysis?: Partial<AnalysisConfig>;
  alerting?: Partial<AlertingConfig>;
  storage?: Partial<StorageConfig>;
  logging?: {
    level?: LogLevel;
    enableConsole?: boolean;
    enableFile?: boolean;
    filePath?: string;
  };
  errorHandling?: Partial<ErrorHandlerConfig>;
}

export interface PerformanceEngineComponents {
  service: PerformanceAnalysisService;
  metricsCollector: MetricsCollector;
  statisticalAnalyzer: StatisticalAnalyzer;
  trendAnalyzer: TrendAnalyzer;
  resourceAnalyzer: ResourceAnalyzer;
  bottleneckDetector: BottleneckDetector;
  reportGenerator: ReportGenerator;
  logger: PerformanceLogger;
  errorHandler: ErrorHandler;
}

/**
 * Create a fully configured performance analysis engine
 */
export function createPerformanceAnalysisEngine(
  options: PerformanceEngineOptions = {}
): PerformanceEngineComponents {
  // Create logger first
  const logger = new PerformanceLogger({
    level: options.logging?.level || LogLevel.INFO,
    enableConsole: options.logging?.enableConsole ?? true,
    enableFile: options.logging?.enableFile ?? false,
    filePath: options.logging?.filePath,
    enableMetrics: true
  });

  // Create error handler
  const errorHandler = new ErrorHandler({
    maxRetries: 3,
    retryDelayMs: 1000,
    enableRecovery: true,
    enableNotifications: true,
    criticalErrorThreshold: 10,
    logger,
    ...options.errorHandling
  });

  // Create configuration
  const config: PerformanceAnalysisConfig = {
    sampling: {
      interval: 10000, // 10 seconds
      batchSize: 100,
      retentionPeriod: 7, // 7 days
      compressionEnabled: true,
      ...options.sampling
    },
    analysis: {
      windowSize: 5, // 5 minutes
      trendAnalysisWindow: 24, // 24 hours
      forecastHorizon: 12, // 12 hours
      outlierThreshold: 2.5,
      correlationThreshold: 0.7,
      ...options.analysis
    },
    alerting: {
      enabled: true,
      thresholds: {
        latency: 5000, // 5 seconds
        errorRate: 0.05, // 5%
        cpuUsage: 80, // 80%
        memoryUsage: 85, // 85%
      },
      notifications: [],
      ...options.alerting
    },
    storage: {
      type: 'memory',
      config: {},
      ...options.storage
    }
  };

  // Create analysis components
  const statisticalAnalyzer = new StatisticalAnalyzer();
  const trendAnalyzer = new TrendAnalyzer();
  const resourceAnalyzer = new ResourceAnalyzer();
  const bottleneckDetector = new BottleneckDetector();
  const reportGenerator = new ReportGenerator();

  // Create metrics collector
  const metricsCollector = new MetricsCollector(config.sampling, config.storage);

  // Create main service
  const service = new PerformanceAnalysisService(config);

  // Wire up error handling
  service.on('error', (error) => {
    errorHandler.handleError(
      'analysis' as any,
      'PerformanceAnalysisService',
      'analysis',
      error.error || error,
      error.context
    );
  });

  metricsCollector.on('error', (error) => {
    errorHandler.handleCollectionError(
      'MetricsCollector',
      'collection',
      error.error || error,
      error.context
    );
  });

  // Setup logging for components
  service.on('analysis:started', (event) => {
    logger.info('PerformanceAnalysisService', `Analysis started: ${event.analysisId}`, event);
  });

  service.on('analysis:completed', (event) => {
    logger.logAnalysisResult(
      'PerformanceAnalysisService',
      event.analysisId,
      event.result.timeRange.duration,
      {
        totalOperations: event.result.summary.totalOperations,
        health: event.result.summary.overallHealth,
        bottlenecks: event.result.bottlenecks.length
      }
    );
  });

  metricsCollector.on('metrics:collected', (event) => {
    logger.debug('MetricsCollector', `Collected ${event.count} metrics`, event);
  });

  // Setup alerts
  service.on('alert:critical', (alert) => {
    logger.critical('AlertSystem', alert.message, alert.data);
    errorHandler.handleError(
      'system' as any,
      'AlertSystem',
      'critical_alert',
      alert.message,
      alert.data
    );
  });

  service.on('alert:bottleneck', (alert) => {
    logger.warn('AlertSystem', alert.message, alert.data);
    alert.data.forEach((bottleneck: any) => {
      logger.logBottleneckDetected(
        'BottleneckDetector',
        bottleneck.type,
        bottleneck.severity,
        bottleneck.description,
        { bottleneckId: bottleneck.id }
      );
    });
  });

  logger.info('PerformanceAnalysisFactory', 'Performance analysis engine created', {
    samplingInterval: config.sampling.interval,
    analysisWindow: config.analysis.windowSize,
    alertingEnabled: config.alerting.enabled,
    storageType: config.storage.type
  });

  return {
    service,
    metricsCollector,
    statisticalAnalyzer,
    trendAnalyzer,
    resourceAnalyzer,
    bottleneckDetector,
    reportGenerator,
    logger,
    errorHandler
  };
}

/**
 * Create a lightweight performance analysis engine for development
 */
export function createDevelopmentEngine(): PerformanceEngineComponents {
  return createPerformanceAnalysisEngine({
    sampling: {
      interval: 5000, // 5 seconds
      batchSize: 50,
      retentionPeriod: 1, // 1 day
      compressionEnabled: false
    },
    analysis: {
      windowSize: 1, // 1 minute
      trendAnalysisWindow: 2, // 2 hours
      forecastHorizon: 1, // 1 hour
    },
    alerting: {
      enabled: true,
      thresholds: {
        latency: 2000, // 2 seconds
        errorRate: 0.1, // 10%
        cpuUsage: 70, // 70%
        memoryUsage: 75, // 75%
      }
    },
    logging: {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false
    },
    errorHandling: {
      maxRetries: 2,
      enableRecovery: true,
      enableNotifications: false
    }
  });
}

/**
 * Create a production-ready performance analysis engine
 */
export function createProductionEngine(options: {
  logFilePath?: string;
  retentionDays?: number;
  alertingThresholds?: Record<string, number>;
}): PerformanceEngineComponents {
  return createPerformanceAnalysisEngine({
    sampling: {
      interval: 30000, // 30 seconds
      batchSize: 200,
      retentionPeriod: options.retentionDays || 30, // 30 days
      compressionEnabled: true
    },
    analysis: {
      windowSize: 15, // 15 minutes
      trendAnalysisWindow: 168, // 1 week
      forecastHorizon: 24, // 24 hours
      outlierThreshold: 3.0,
      correlationThreshold: 0.8
    },
    alerting: {
      enabled: true,
      thresholds: {
        latency: 3000, // 3 seconds
        errorRate: 0.02, // 2%
        cpuUsage: 85, // 85%
        memoryUsage: 90, // 90%
        ...options.alertingThresholds
      }
    },
    logging: {
      level: LogLevel.INFO,
      enableConsole: false,
      enableFile: true,
      filePath: options.logFilePath || './logs/performance.log'
    },
    errorHandling: {
      maxRetries: 5,
      retryDelayMs: 2000,
      enableRecovery: true,
      enableNotifications: true,
      criticalErrorThreshold: 5
    }
  });
}

/**
 * Create a high-performance analysis engine for high-throughput environments
 */
export function createHighThroughputEngine(): PerformanceEngineComponents {
  return createPerformanceAnalysisEngine({
    sampling: {
      interval: 1000, // 1 second
      batchSize: 500,
      retentionPeriod: 7, // 7 days
      compressionEnabled: true
    },
    analysis: {
      windowSize: 1, // 1 minute
      trendAnalysisWindow: 24, // 24 hours
      forecastHorizon: 6, // 6 hours
      outlierThreshold: 2.0,
      correlationThreshold: 0.6
    },
    alerting: {
      enabled: true,
      thresholds: {
        latency: 1000, // 1 second
        errorRate: 0.01, // 1%
        cpuUsage: 90, // 90%
        memoryUsage: 95, // 95%
      }
    },
    logging: {
      level: LogLevel.WARN, // Reduce logging overhead
      enableConsole: false,
      enableFile: true
    },
    errorHandling: {
      maxRetries: 3,
      enableRecovery: true,
      enableNotifications: true,
      criticalErrorThreshold: 20 // Higher threshold for high-throughput
    }
  });
}