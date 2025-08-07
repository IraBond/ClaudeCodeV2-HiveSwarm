/**
 * Claude-Flow Performance Reporting System - Main Entry Point
 * Exports all core components and provides system initialization
 */

// Core interfaces
export * from './interfaces.js';

// Core components
export { PerformanceCollector } from './collector.js';
export { MetricsAnalyzer } from './metrics-analyzer.js';
export { ComparisonEngine } from './comparison-engine.js';
export { ReportGenerator } from './report-generator.js';
export { VisualizationRenderer } from './visualization-renderer.js';

// CLI integration
export { PerformanceReportingCLI, setupPerformanceReportingCLI } from './cli-integration.js';

// System initialization
import {
  PerformanceCollector,
  MetricsAnalyzer,
  ComparisonEngine,
  ReportGenerator,
  VisualizationRenderer
} from './index.js';
import {
  CollectorConfig,
  AnalyzerConfig,
  ComparisonConfig,
  IPerformanceCollector,
  IMetricsAnalyzer,
  IComparisonEngine,
  IReportGenerator,
  IVisualizationRenderer,
  PerformanceReportingError,
  ErrorCode
} from './interfaces.js';

/**
 * Configuration for the entire performance reporting system
 */
export interface PerformanceReportingSystemConfig {
  collector: CollectorConfig;
  analyzer?: AnalyzerConfig;
  comparison?: ComparisonConfig;
  enableCLI?: boolean;
  enableWebInterface?: boolean;
}

/**
 * Main performance reporting system class
 * Coordinates all components and provides unified interface
 */
export class PerformanceReportingSystem {
  private collector: IPerformanceCollector;
  private analyzer: IMetricsAnalyzer;
  private comparisonEngine: IComparisonEngine;
  private reportGenerator: IReportGenerator;
  private visualizationRenderer: IVisualizationRenderer;
  private isInitialized = false;

  constructor(private config: PerformanceReportingSystemConfig) {
    this.validateConfig(config);
    this.initializeComponents();
  }

  /**
   * Initialize the performance reporting system
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Claude-Flow Performance Reporting System...');

      // Start performance collector
      await this.collector.start();
      
      // Set up component integrations
      this.setupIntegrations();
      
      this.isInitialized = true;
      console.log('✅ Performance Reporting System initialized successfully');
      
      // Log system status
      this.logSystemStatus();

    } catch (error) {
      throw new PerformanceReportingError(
        `System initialization failed: ${error.message}`,
        ErrorCode.COLLECTOR_INIT_FAILED,
        'PerformanceReportingSystem',
        { error: error.message }
      );
    }
  }

  /**
   * Shutdown the performance reporting system
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down Performance Reporting System...');
      
      await this.collector.stop();
      this.isInitialized = false;
      
      console.log('✅ Performance Reporting System shut down successfully');
    } catch (error) {
      console.error(`Warning: Shutdown error - ${error.message}`);
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const collectorStatus = this.collector.getStatus();
    
    return {
      overall: this.isInitialized && collectorStatus.isRunning ? 'healthy' : 'unhealthy',
      components: {
        collector: collectorStatus.isRunning ? 'running' : 'stopped',
        analyzer: 'ready',
        comparisonEngine: 'ready',
        reportGenerator: 'ready',
        visualizationRenderer: 'ready'
      },
      metrics: {
        metricsCollected: collectorStatus.metricsCollected,
        errorCount: collectorStatus.errorCount,
        avgCollectionTime: collectorStatus.avgCollectionTime,
        lastCollection: collectorStatus.lastCollection
      },
      uptime: this.isInitialized ? Date.now() - (collectorStatus.lastCollection || 0) : 0
    };
  }

  /**
   * Quick performance report for a swarm
   */
  async getQuickReport(swarmId: string, timeRange?: { start: number; end: number }): Promise<QuickReport> {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }

    try {
      // Collect recent metrics
      const metrics = await this.collector.collect(swarmId, 10000); // 10 second timeout
      
      if (metrics.length === 0) {
        return {
          swarmId,
          timestamp: Date.now(),
          status: 'no_data',
          summary: 'No metrics available for this swarm',
          keyMetrics: {}
        };
      }

      // Quick analysis
      const analysis = await this.analyzer.analyze(metrics);
      
      // Extract key metrics
      const keyMetrics = this.extractKeyMetrics(analysis.statistics);
      
      return {
        swarmId,
        timestamp: Date.now(),
        status: analysis.anomalies.length > 0 ? 'warning' : 'healthy',
        summary: this.generateQuickSummary(analysis),
        keyMetrics,
        insights: analysis.insights.slice(0, 3), // Top 3 insights
        anomalies: analysis.anomalies.filter(a => a.severity === 'critical').slice(0, 2) // Top 2 critical anomalies
      };

    } catch (error) {
      throw new PerformanceReportingError(
        `Quick report generation failed: ${error.message}`,
        ErrorCode.ANALYSIS_FAILED,
        'PerformanceReportingSystem',
        { swarmId, error: error.message }
      );
    }
  }

  /**
   * Access to individual components
   */
  get components() {
    return {
      collector: this.collector,
      analyzer: this.analyzer,
      comparisonEngine: this.comparisonEngine,
      reportGenerator: this.reportGenerator,
      visualizationRenderer: this.visualizationRenderer
    };
  }

  /**
   * Update system configuration
   */
  updateConfiguration(updates: Partial<PerformanceReportingSystemConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.collector) {
      this.collector.configure(updates.collector);
    }
  }

  // Private methods

  private validateConfig(config: PerformanceReportingSystemConfig): void {
    if (!config.collector) {
      throw new Error('Collector configuration is required');
    }
    
    if (!config.collector.sources || config.collector.sources.length === 0) {
      throw new Error('At least one metric source must be configured');
    }
  }

  private initializeComponents(): void {
    // Initialize all components with their configurations
    this.collector = new PerformanceCollector(this.config.collector);
    this.analyzer = new MetricsAnalyzer();
    this.comparisonEngine = new ComparisonEngine();
    this.reportGenerator = new ReportGenerator();
    this.visualizationRenderer = new VisualizationRenderer();
  }

  private setupIntegrations(): void {
    // Set up cross-component integrations
    
    // Collector -> Analyzer pipeline
    this.collector.on('metrics:batch', async (event) => {
      try {
        // Auto-analyze batches of metrics
        const analysis = await this.analyzer.analyze(event.metrics);
        
        // Emit analysis results
        this.collector.emit('analysis:completed', {
          swarmId: event.metrics[0]?.swarmId,
          analysis,
          timestamp: Date.now()
        });

        // Check for critical anomalies
        const criticalAnomalies = analysis.anomalies.filter(a => a.severity === 'critical');
        if (criticalAnomalies.length > 0) {
          console.warn(`⚠️  Critical anomalies detected in ${event.metrics[0]?.swarmId}:`, 
            criticalAnomalies.map(a => a.description).join(', '));
        }

      } catch (error) {
        console.error('Auto-analysis failed:', error.message);
      }
    });

    // Set up error handling
    this.collector.on('error', this.handleComponentError.bind(this));
  }

  private handleComponentError(error: any): void {
    console.error('Component error:', error);
    // Could implement retry logic, alerting, etc.
  }

  private logSystemStatus(): void {
    const health = this.getSystemHealth();
    
    console.log('\n📊 System Status:');
    console.log('─'.repeat(50));
    console.log(`Overall Health: ${health.overall === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`Collector: ${health.components.collector === 'running' ? '🟢' : '🔴'} ${health.components.collector}`);
    console.log(`Metrics Collected: ${health.metrics.metricsCollected}`);
    console.log(`Error Count: ${health.metrics.errorCount}`);
    console.log(`Avg Collection Time: ${health.metrics.avgCollectionTime.toFixed(2)}ms`);
    console.log('─'.repeat(50));
  }

  private extractKeyMetrics(statistics: any): Record<string, any> {
    const keyMetrics: Record<string, any> = {};
    
    if (statistics.metrics.TASK_DURATION) {
      keyMetrics.avgTaskDuration = statistics.metrics.TASK_DURATION.mean;
      keyMetrics.p95TaskDuration = statistics.metrics.TASK_DURATION.percentiles.p95;
    }
    
    if (statistics.metrics.ERROR_RATE) {
      keyMetrics.errorRate = (statistics.metrics.ERROR_RATE.mean * 100).toFixed(2) + '%';
    }
    
    if (statistics.metrics.MEMORY_USAGE) {
      keyMetrics.memoryUsage = (statistics.metrics.MEMORY_USAGE.mean * 100).toFixed(1) + '%';
    }
    
    if (statistics.metrics.THROUGHPUT) {
      keyMetrics.throughput = statistics.metrics.THROUGHPUT.mean.toFixed(2) + ' ops/sec';
    }
    
    return keyMetrics;
  }

  private generateQuickSummary(analysis: any): string {
    const insights = analysis.insights.length;
    const anomalies = analysis.anomalies.length;
    const criticalAnomalies = analysis.anomalies.filter(a => a.severity === 'critical').length;
    
    if (criticalAnomalies > 0) {
      return `⚠️  ${criticalAnomalies} critical issue${criticalAnomalies > 1 ? 's' : ''} detected requiring immediate attention`;
    }
    
    if (anomalies > 0) {
      return `📊 ${anomalies} anomal${anomalies > 1 ? 'ies' : 'y'} detected, ${insights} insight${insights > 1 ? 's' : ''} generated`;
    }
    
    if (insights > 0) {
      return `✅ Performance looks good with ${insights} optimization insight${insights > 1 ? 's' : ''} available`;
    }
    
    return '✅ Performance is stable with no significant issues detected';
  }
}

// Type definitions for system health and quick reports

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  components: {
    collector: 'running' | 'stopped' | 'error';
    analyzer: 'ready' | 'busy' | 'error';
    comparisonEngine: 'ready' | 'busy' | 'error';
    reportGenerator: 'ready' | 'busy' | 'error';
    visualizationRenderer: 'ready' | 'busy' | 'error';
  };
  metrics: {
    metricsCollected: number;
    errorCount: number;
    avgCollectionTime: number;
    lastCollection: number;
  };
  uptime: number;
}

export interface QuickReport {
  swarmId: string;
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical' | 'no_data';
  summary: string;
  keyMetrics: Record<string, any>;
  insights?: any[];
  anomalies?: any[];
}

// Default configurations

export const DEFAULT_SYSTEM_CONFIG: PerformanceReportingSystemConfig = {
  collector: {
    enabled: true,
    interval: 5000,
    batchSize: 100,
    bufferSize: 1000,
    timeout: 30000,
    retryAttempts: 3,
    sources: ['agent', 'coordinator', 'memory', 'neural', 'system'] as any,
    sampling: {
      enabled: false,
      rate: 1.0,
      strategy: 'uniform'
    }
  },
  analyzer: {
    enabled: true,
    analysisInterval: 30000,
    anomalyDetection: {
      enabled: true,
      sensitivity: 2.5,
      methods: ['zscore'],
      windowSize: 100
    },
    trendAnalysis: {
      enabled: true,
      methods: ['linear'],
      predictionHorizon: 300000, // 5 minutes
      confidence: 0.7
    },
    statisticalMethods: ['basic', 'correlation']
  },
  comparison: {
    enabled: true,
    maxSwarms: 10,
    significanceLevel: 0.05,
    rankingWeights: {
      TASK_DURATION: 0.3,
      ERROR_RATE: 0.25,
      MEMORY_USAGE: 0.2,
      THROUGHPUT: 0.15,
      CPU_USAGE: 0.1
    } as any,
    benchmarkThresholds: {
      TASK_DURATION: 1000,
      ERROR_RATE: 0.05,
      MEMORY_USAGE: 0.8
    } as any
  },
  enableCLI: true,
  enableWebInterface: true
};

/**
 * Factory function to create a configured performance reporting system
 */
export function createPerformanceReportingSystem(
  config?: Partial<PerformanceReportingSystemConfig>
): PerformanceReportingSystem {
  const mergedConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...config,
    collector: {
      ...DEFAULT_SYSTEM_CONFIG.collector,
      ...config?.collector
    },
    analyzer: {
      ...DEFAULT_SYSTEM_CONFIG.analyzer,
      ...config?.analyzer
    },
    comparison: {
      ...DEFAULT_SYSTEM_CONFIG.comparison,
      ...config?.comparison
    }
  };

  return new PerformanceReportingSystem(mergedConfig);
}

// Version information
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

console.log(`📊 Claude-Flow Performance Reporting System v${VERSION} loaded`);