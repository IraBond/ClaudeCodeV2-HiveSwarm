/**
 * Claude-Flow Performance Reporting System - Performance Collector
 * Responsible for gathering real-time metrics from swarm operations
 */

import { EventEmitter } from 'events';
import {
  IPerformanceCollector,
  PerformanceMetric,
  CollectorConfig,
  CollectorStatus,
  MetricCallback,
  MetricType,
  MetricSource,
  MetricPriority,
  MetricCategory,
  PerformanceReportingError,
  ErrorCode,
  SamplingConfig
} from './interfaces.js';

export class PerformanceCollector extends EventEmitter implements IPerformanceCollector {
  private isRunning = false;
  private config: CollectorConfig;
  private subscribers = new Map<MetricType, Set<MetricCallback>>();
  private metricsBuffer: PerformanceMetric[] = [];
  private collectionTimer?: NodeJS.Timeout;
  private status: CollectorStatus;
  private swarmConnections = new Map<string, WebSocket>();

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
    this.status = {
      isRunning: false,
      lastCollection: 0,
      metricsCollected: 0,
      errorCount: 0,
      avgCollectionTime: 0
    };
    this.setupDefaultSubscribers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new PerformanceReportingError(
        'Collector is already running',
        ErrorCode.COLLECTOR_INIT_FAILED,
        'PerformanceCollector'
      );
    }

    try {
      await this.initializeConnections();
      this.startCollectionTimer();
      this.isRunning = true;
      this.status.isRunning = true;
      
      this.emit('collector:started', { timestamp: Date.now() });
      console.log('🚀 PerformanceCollector started with config:', {
        interval: this.config.interval,
        sources: this.config.sources.length,
        batchSize: this.config.batchSize
      });
    } catch (error) {
      throw new PerformanceReportingError(
        `Failed to start collector: ${error.message}`,
        ErrorCode.COLLECTOR_INIT_FAILED,
        'PerformanceCollector',
        { error: error.message }
      );
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (this.collectionTimer) {
        clearInterval(this.collectionTimer);
        this.collectionTimer = undefined;
      }

      // Flush remaining metrics
      if (this.metricsBuffer.length > 0) {
        await this.flushBuffer();
      }

      // Close swarm connections
      for (const [swarmId, connection] of this.swarmConnections.entries()) {
        connection.close();
        this.swarmConnections.delete(swarmId);
      }

      this.isRunning = false;
      this.status.isRunning = false;
      
      this.emit('collector:stopped', { timestamp: Date.now() });
      console.log('🛑 PerformanceCollector stopped');
    } catch (error) {
      throw new PerformanceReportingError(
        `Failed to stop collector: ${error.message}`,
        ErrorCode.COLLECTOR_INIT_FAILED,
        'PerformanceCollector',
        { error: error.message }
      );
    }
  }

  configure(config: CollectorConfig): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };
    
    if (wasRunning) {
      this.start();
    }

    this.emit('collector:configured', { config: this.config });
  }

  async collect(swarmId: string, duration?: number): Promise<PerformanceMetric[]> {
    const startTime = Date.now();
    const collectionTimeout = duration || this.config.timeout;
    
    try {
      const metrics: PerformanceMetric[] = [];

      // Collect from different sources
      for (const source of this.config.sources) {
        const sourceMetrics = await this.collectFromSource(swarmId, source, collectionTimeout);
        metrics.push(...sourceMetrics);
      }

      // Apply sampling if configured
      const sampledMetrics = this.applySampling(metrics);
      
      // Update status
      const collectionTime = Date.now() - startTime;
      this.updateCollectionStatus(sampledMetrics.length, collectionTime);

      // Emit metrics to subscribers
      this.emitMetricsToSubscribers(sampledMetrics);

      return sampledMetrics;
    } catch (error) {
      this.status.errorCount++;
      throw new PerformanceReportingError(
        `Collection failed for swarm ${swarmId}: ${error.message}`,
        ErrorCode.COLLECTOR_INIT_FAILED,
        'PerformanceCollector',
        { swarmId, error: error.message }
      );
    }
  }

  async *collectRealtime(swarmId: string): AsyncIterableIterator<PerformanceMetric> {
    const connection = await this.establishSwarmConnection(swarmId);
    
    try {
      while (this.isRunning) {
        const metrics = await this.collect(swarmId, 1000); // 1 second collection window
        
        for (const metric of metrics) {
          yield metric;
        }

        // Wait for next collection interval
        await new Promise(resolve => setTimeout(resolve, this.config.interval));
      }
    } finally {
      connection?.close();
    }
  }

  subscribe(metricType: MetricType, callback: MetricCallback): void {
    if (!this.subscribers.has(metricType)) {
      this.subscribers.set(metricType, new Set());
    }
    this.subscribers.get(metricType)!.add(callback);
    
    this.emit('subscriber:added', { metricType, subscriberCount: this.subscribers.get(metricType)!.size });
  }

  unsubscribe(metricType: MetricType, callback: MetricCallback): void {
    const subscribers = this.subscribers.get(metricType);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(metricType);
      }
    }

    this.emit('subscriber:removed', { metricType });
  }

  getStatus(): CollectorStatus {
    return { ...this.status };
  }

  // Private methods

  private setupDefaultSubscribers(): void {
    // Set up default metric processing
    this.subscribe(MetricType.ERROR_RATE, (metric) => {
      if (typeof metric.value === 'number' && metric.value > 0.1) {
        this.emit('high:error_rate', { swarmId: metric.swarmId, value: metric.value });
      }
    });

    this.subscribe(MetricType.MEMORY_USAGE, (metric) => {
      if (typeof metric.value === 'number' && metric.value > 0.9) {
        this.emit('high:memory_usage', { swarmId: metric.swarmId, value: metric.value });
      }
    });
  }

  private async initializeConnections(): Promise<void> {
    // Initialize connections to various metric sources
    // This would connect to agent endpoints, coordinator APIs, etc.
    console.log('🔗 Initializing metric source connections...');
    
    // Simulate connection setup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private startCollectionTimer(): void {
    this.collectionTimer = setInterval(async () => {
      try {
        await this.performScheduledCollection();
      } catch (error) {
        this.emit('collection:error', { error: error.message, timestamp: Date.now() });
      }
    }, this.config.interval);
  }

  private async performScheduledCollection(): Promise<void> {
    // Collect metrics from all active swarms
    const activeSwarms = await this.getActiveSwarms();
    
    for (const swarmId of activeSwarms) {
      try {
        const metrics = await this.collect(swarmId);
        this.addToBuffer(metrics);
      } catch (error) {
        console.warn(`Failed to collect metrics for swarm ${swarmId}:`, error.message);
      }
    }

    // Flush buffer if it's full
    if (this.metricsBuffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }
  }

  private async collectFromSource(
    swarmId: string,
    source: MetricSource,
    timeout: number
  ): Promise<PerformanceMetric[]> {
    const startTime = Date.now();
    const metrics: PerformanceMetric[] = [];

    switch (source) {
      case MetricSource.AGENT:
        metrics.push(...await this.collectAgentMetrics(swarmId, timeout));
        break;
      case MetricSource.COORDINATOR:
        metrics.push(...await this.collectCoordinatorMetrics(swarmId, timeout));
        break;
      case MetricSource.MEMORY:
        metrics.push(...await this.collectMemoryMetrics(swarmId, timeout));
        break;
      case MetricSource.NEURAL:
        metrics.push(...await this.collectNeuralMetrics(swarmId, timeout));
        break;
      case MetricSource.SYSTEM:
        metrics.push(...await this.collectSystemMetrics(swarmId, timeout));
        break;
    }

    return metrics.map(metric => ({
      ...metric,
      metadata: {
        ...metric.metadata,
        collectionTime: Date.now() - startTime
      }
    }));
  }

  private async collectAgentMetrics(swarmId: string, timeout: number): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    
    // Simulate agent metric collection
    const agents = await this.getSwarmAgents(swarmId);
    
    for (const agentId of agents) {
      metrics.push(
        this.createMetric({
          swarmId,
          agentId,
          metricType: MetricType.TASK_DURATION,
          value: Math.random() * 1000 + 100,
          unit: 'ms',
          source: MetricSource.AGENT,
          priority: MetricPriority.HIGH,
          category: MetricCategory.PERFORMANCE
        }),
        this.createMetric({
          swarmId,
          agentId,
          metricType: MetricType.MEMORY_USAGE,
          value: Math.random() * 0.8 + 0.1,
          unit: 'ratio',
          source: MetricSource.AGENT,
          priority: MetricPriority.MEDIUM,
          category: MetricCategory.RESOURCE
        })
      );
    }

    return metrics;
  }

  private async collectCoordinatorMetrics(swarmId: string, timeout: number): Promise<PerformanceMetric[]> {
    return [
      this.createMetric({
        swarmId,
        metricType: MetricType.SWARM_COORDINATION_TIME,
        value: Math.random() * 50 + 10,
        unit: 'ms',
        source: MetricSource.COORDINATOR,
        priority: MetricPriority.HIGH,
        category: MetricCategory.PERFORMANCE
      }),
      this.createMetric({
        swarmId,
        metricType: MetricType.CONCURRENT_AGENTS,
        value: Math.floor(Math.random() * 10 + 1),
        unit: 'count',
        source: MetricSource.COORDINATOR,
        priority: MetricPriority.MEDIUM,
        category: MetricCategory.BUSINESS
      })
    ];
  }

  private async collectMemoryMetrics(swarmId: string, timeout: number): Promise<PerformanceMetric[]> {
    return [
      this.createMetric({
        swarmId,
        metricType: MetricType.MEMORY_USAGE,
        value: Math.random() * 0.7 + 0.2,
        unit: 'ratio',
        source: MetricSource.MEMORY,
        priority: MetricPriority.MEDIUM,
        category: MetricCategory.RESOURCE
      })
    ];
  }

  private async collectNeuralMetrics(swarmId: string, timeout: number): Promise<PerformanceMetric[]> {
    return [
      this.createMetric({
        swarmId,
        metricType: MetricType.NEURAL_PROCESSING_TIME,
        value: Math.random() * 200 + 50,
        unit: 'ms',
        source: MetricSource.NEURAL,
        priority: MetricPriority.HIGH,
        category: MetricCategory.PERFORMANCE
      }),
      this.createMetric({
        swarmId,
        metricType: MetricType.TOKEN_USAGE,
        value: Math.floor(Math.random() * 1000 + 100),
        unit: 'tokens',
        source: MetricSource.NEURAL,
        priority: MetricPriority.LOW,
        category: MetricCategory.BUSINESS
      })
    ];
  }

  private async collectSystemMetrics(swarmId: string, timeout: number): Promise<PerformanceMetric[]> {
    return [
      this.createMetric({
        swarmId,
        metricType: MetricType.CPU_USAGE,
        value: Math.random() * 0.8 + 0.1,
        unit: 'ratio',
        source: MetricSource.SYSTEM,
        priority: MetricPriority.MEDIUM,
        category: MetricCategory.RESOURCE
      }),
      this.createMetric({
        swarmId,
        metricType: MetricType.NETWORK_LATENCY,
        value: Math.random() * 100 + 10,
        unit: 'ms',
        source: MetricSource.SYSTEM,
        priority: MetricPriority.MEDIUM,
        category: MetricCategory.PERFORMANCE
      })
    ];
  }

  private createMetric(params: {
    swarmId: string;
    agentId?: string;
    metricType: MetricType;
    value: number | object | string;
    unit: string;
    source: MetricSource;
    priority: MetricPriority;
    category: MetricCategory;
  }): PerformanceMetric {
    return {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      tags: {
        collector_version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      metadata: {
        source: params.source,
        priority: params.priority,
        category: params.category,
        dimensions: [params.swarmId, params.agentId].filter(Boolean)
      },
      ...params
    };
  }

  private applySampling(metrics: PerformanceMetric[]): PerformanceMetric[] {
    if (!this.config.sampling?.enabled) {
      return metrics;
    }

    const { rate, strategy } = this.config.sampling;

    switch (strategy) {
      case 'uniform':
        return metrics.filter(() => Math.random() < rate);
      case 'priority':
        return metrics.filter(metric => {
          const priorityRate = metric.metadata.priority === MetricPriority.HIGH ? 1 : 
                              metric.metadata.priority === MetricPriority.MEDIUM ? rate * 1.5 : rate;
          return Math.random() < priorityRate;
        });
      case 'adaptive':
        // Implement adaptive sampling based on current load
        const load = this.metricsBuffer.length / this.config.bufferSize;
        const adaptiveRate = rate * (1 - load * 0.5);
        return metrics.filter(() => Math.random() < adaptiveRate);
      default:
        return metrics;
    }
  }

  private emitMetricsToSubscribers(metrics: PerformanceMetric[]): void {
    for (const metric of metrics) {
      const subscribers = this.subscribers.get(metric.metricType);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(metric);
          } catch (error) {
            console.warn(`Subscriber callback failed for ${metric.metricType}:`, error.message);
          }
        });
      }
    }
  }

  private updateCollectionStatus(metricCount: number, collectionTime: number): void {
    this.status.lastCollection = Date.now();
    this.status.metricsCollected += metricCount;
    this.status.avgCollectionTime = 
      (this.status.avgCollectionTime * 0.9) + (collectionTime * 0.1);
  }

  private addToBuffer(metrics: PerformanceMetric[]): void {
    this.metricsBuffer.push(...metrics);
    
    // Prevent buffer overflow
    if (this.metricsBuffer.length > this.config.bufferSize) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.config.bufferSize);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Emit batch of metrics
      this.emit('metrics:batch', {
        metrics: metricsToFlush,
        count: metricsToFlush.length,
        timestamp: Date.now()
      });

      // Here you would typically persist to database
      // await this.persistMetrics(metricsToFlush);
    } catch (error) {
      // Put metrics back in buffer on failure
      this.metricsBuffer.unshift(...metricsToFlush);
      throw error;
    }
  }

  private async establishSwarmConnection(swarmId: string): Promise<WebSocket | null> {
    if (this.swarmConnections.has(swarmId)) {
      return this.swarmConnections.get(swarmId)!;
    }

    try {
      // In real implementation, this would connect to the actual swarm WebSocket
      // const connection = new WebSocket(`ws://swarm-coordinator/${swarmId}/metrics`);
      // this.swarmConnections.set(swarmId, connection);
      // return connection;
      return null;
    } catch (error) {
      console.warn(`Failed to establish connection to swarm ${swarmId}:`, error.message);
      return null;
    }
  }

  private async getActiveSwarms(): Promise<string[]> {
    // In real implementation, this would query the swarm coordinator
    return ['swarm-1', 'swarm-2', 'swarm-3'];
  }

  private async getSwarmAgents(swarmId: string): Promise<string[]> {
    // In real implementation, this would query the swarm for active agents
    return [`${swarmId}-agent-1`, `${swarmId}-agent-2`, `${swarmId}-agent-3`];
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}