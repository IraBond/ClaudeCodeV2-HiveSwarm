/**
 * Performance Metrics Collector
 * Handles collection, storage, and retrieval of swarm performance metrics
 */

import { EventEmitter } from 'events';
import {
  PerformanceMetric,
  SwarmOperationMetrics,
  IPerformanceCollector,
  MetricQuery,
  TimeRange,
  MetricType,
  SamplingConfig,
  StorageConfig,
  ResourceUsage,
  OperationError,
  SwarmOperationType
} from '../types';

export class MetricsCollector extends EventEmitter implements IPerformanceCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private swarmMetrics: Map<string, SwarmOperationMetrics[]> = new Map();
  private config: SamplingConfig;
  private storage: StorageConfig;
  private collectionTimer?: NodeJS.Timer;

  constructor(config: SamplingConfig, storage: StorageConfig) {
    super();
    this.config = config;
    this.storage = storage;
    this.startCollection();
  }

  /**
   * Start automatic metric collection
   */
  private startCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    this.collectionTimer = setInterval(() => {
      this.performSystemCollection();
    }, this.config.interval);

    this.emit('collection:started');
  }

  /**
   * Stop metric collection
   */
  public stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
    this.emit('collection:stopped');
  }

  /**
   * Collect performance metrics
   */
  async collect(metrics: PerformanceMetric[]): Promise<void> {
    try {
      const timestamp = Date.now();

      for (const metric of metrics) {
        const key = this.getMetricKey(metric);
        
        if (!this.metrics.has(key)) {
          this.metrics.set(key, []);
        }

        const metricList = this.metrics.get(key)!;
        metricList.push({
          ...metric,
          timestamp: metric.timestamp || timestamp
        });

        // Apply retention policy
        this.applyRetention(key, metricList);
      }

      // Emit collection event
      this.emit('metrics:collected', {
        count: metrics.length,
        timestamp
      });

      // Compress if needed
      if (this.config.compressionEnabled && metrics.length >= this.config.batchSize) {
        await this.compressMetrics();
      }

    } catch (error) {
      this.emit('error', {
        type: 'collection',
        error: error as Error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Collect swarm operation metrics
   */
  async collectSwarmMetrics(swarmMetrics: SwarmOperationMetrics): Promise<void> {
    try {
      const swarmId = swarmMetrics.swarmId;
      
      if (!this.swarmMetrics.has(swarmId)) {
        this.swarmMetrics.set(swarmId, []);
      }

      const metricsList = this.swarmMetrics.get(swarmId)!;
      metricsList.push(swarmMetrics);

      // Apply retention
      this.applySwarmRetention(swarmId, metricsList);

      this.emit('swarm:metrics:collected', {
        swarmId,
        operationType: swarmMetrics.operationType,
        timestamp: swarmMetrics.startTime
      });

    } catch (error) {
      this.emit('error', {
        type: 'swarm_collection',
        error: error as Error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Get metrics based on query
   */
  async getMetrics(query: MetricQuery): Promise<PerformanceMetric[]> {
    try {
      let results: PerformanceMetric[] = [];

      // Collect from all relevant metric keys
      for (const [key, metrics] of this.metrics.entries()) {
        const filteredMetrics = this.filterMetrics(metrics, query);
        results = results.concat(filteredMetrics);
      }

      // Sort by timestamp
      results.sort((a, b) => a.timestamp - b.timestamp);

      return results;

    } catch (error) {
      this.emit('error', {
        type: 'query',
        error: error as Error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Get swarm metrics
   */
  async getSwarmMetrics(swarmId: string, timeRange?: TimeRange): Promise<SwarmOperationMetrics[]> {
    try {
      const metrics = this.swarmMetrics.get(swarmId) || [];
      
      if (!timeRange) {
        return [...metrics];
      }

      return metrics.filter(metric => 
        metric.startTime >= timeRange.start && 
        metric.startTime <= timeRange.end
      );

    } catch (error) {
      this.emit('error', {
        type: 'swarm_query',
        error: error as Error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Get all swarm IDs
   */
  public getSwarmIds(): string[] {
    return Array.from(this.swarmMetrics.keys());
  }

  /**
   * Create performance metric
   */
  public createMetric(
    metricType: MetricType,
    value: number,
    unit: string,
    agentId?: string,
    swarmId?: string,
    metadata?: Record<string, any>
  ): PerformanceMetric {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      agentId,
      swarmId,
      metricType,
      value,
      unit,
      metadata
    };
  }

  /**
   * Create swarm operation metrics
   */
  public createSwarmOperationMetrics(
    swarmId: string,
    operationType: SwarmOperationType,
    startTime: number,
    agentCount: number,
    taskCount: number
  ): SwarmOperationMetrics {
    return {
      operationId: this.generateId(),
      swarmId,
      operationType,
      startTime,
      agentCount,
      taskCount,
      successRate: 0,
      throughput: 0,
      latency: 0,
      resourceUsage: this.createEmptyResourceUsage(),
      errors: [],
      metadata: {}
    };
  }

  /**
   * Update swarm operation metrics
   */
  public updateSwarmMetrics(
    operationId: string,
    updates: Partial<SwarmOperationMetrics>
  ): void {
    for (const [swarmId, metrics] of this.swarmMetrics.entries()) {
      const metric = metrics.find(m => m.operationId === operationId);
      if (metric) {
        Object.assign(metric, updates);
        
        // Calculate duration if endTime is provided
        if (updates.endTime && metric.startTime) {
          metric.duration = updates.endTime - metric.startTime;
        }

        this.emit('swarm:metrics:updated', {
          swarmId,
          operationId,
          updates
        });
        return;
      }
    }
  }

  /**
   * Record operation error
   */
  public recordError(
    operationId: string,
    error: Omit<OperationError, 'timestamp'>
  ): void {
    const errorWithTimestamp: OperationError = {
      ...error,
      timestamp: Date.now()
    };

    for (const metrics of this.swarmMetrics.values()) {
      const metric = metrics.find(m => m.operationId === operationId);
      if (metric) {
        metric.errors.push(errorWithTimestamp);
        this.emit('operation:error', {
          operationId,
          error: errorWithTimestamp
        });
        return;
      }
    }
  }

  /**
   * Get metric statistics
   */
  public getMetricStats(): {
    totalMetrics: number;
    totalSwarmMetrics: number;
    swarmCount: number;
    oldestMetric?: number;
    newestMetric?: number;
  } {
    let totalMetrics = 0;
    let oldestMetric: number | undefined;
    let newestMetric: number | undefined;

    for (const metrics of this.metrics.values()) {
      totalMetrics += metrics.length;
      
      if (metrics.length > 0) {
        const timestamps = metrics.map(m => m.timestamp);
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);

        if (!oldestMetric || min < oldestMetric) {
          oldestMetric = min;
        }
        if (!newestMetric || max > newestMetric) {
          newestMetric = max;
        }
      }
    }

    let totalSwarmMetrics = 0;
    for (const metrics of this.swarmMetrics.values()) {
      totalSwarmMetrics += metrics.length;
    }

    return {
      totalMetrics,
      totalSwarmMetrics,
      swarmCount: this.swarmMetrics.size,
      oldestMetric,
      newestMetric
    };
  }

  /**
   * Perform automatic system collection
   */
  private async performSystemCollection(): Promise<void> {
    try {
      const systemMetrics = await this.collectSystemMetrics();
      await this.collect(systemMetrics);
    } catch (error) {
      this.emit('error', {
        type: 'system_collection',
        error: error as Error,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const timestamp = Date.now();

    // Memory usage
    const memUsage = process.memoryUsage();
    metrics.push({
      id: this.generateId(),
      timestamp,
      metricType: MetricType.RESOURCE_MEMORY,
      value: memUsage.heapUsed,
      unit: 'bytes',
      metadata: { type: 'heap_used', full: memUsage }
    });

    // CPU usage (approximation)
    const cpuUsage = process.cpuUsage();
    metrics.push({
      id: this.generateId(),
      timestamp,
      metricType: MetricType.RESOURCE_CPU,
      value: cpuUsage.user + cpuUsage.system,
      unit: 'microseconds',
      metadata: { type: 'total', user: cpuUsage.user, system: cpuUsage.system }
    });

    return metrics;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get metric key for storage
   */
  private getMetricKey(metric: PerformanceMetric): string {
    const parts = [metric.metricType];
    if (metric.swarmId) parts.push(`swarm:${metric.swarmId}`);
    if (metric.agentId) parts.push(`agent:${metric.agentId}`);
    return parts.join('|');
  }

  /**
   * Filter metrics based on query
   */
  private filterMetrics(metrics: PerformanceMetric[], query: MetricQuery): PerformanceMetric[] {
    return metrics.filter(metric => {
      // Time range filter
      if (query.timeRange) {
        if (metric.timestamp < query.timeRange.start || 
            metric.timestamp > query.timeRange.end) {
          return false;
        }
      }

      // Metric type filter
      if (query.metricTypes && !query.metricTypes.includes(metric.metricType)) {
        return false;
      }

      // Agent ID filter
      if (query.agentIds && metric.agentId && 
          !query.agentIds.includes(metric.agentId)) {
        return false;
      }

      // Swarm ID filter
      if (query.swarmIds && metric.swarmId && 
          !query.swarmIds.includes(metric.swarmId)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Apply retention policy to metrics
   */
  private applyRetention(key: string, metrics: PerformanceMetric[]): void {
    const retentionTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const filteredMetrics = metrics.filter(m => m.timestamp >= retentionTime);
    
    if (filteredMetrics.length !== metrics.length) {
      this.metrics.set(key, filteredMetrics);
      this.emit('retention:applied', {
        key,
        removedCount: metrics.length - filteredMetrics.length
      });
    }
  }

  /**
   * Apply retention policy to swarm metrics
   */
  private applySwarmRetention(swarmId: string, metrics: SwarmOperationMetrics[]): void {
    const retentionTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const filteredMetrics = metrics.filter(m => m.startTime >= retentionTime);
    
    if (filteredMetrics.length !== metrics.length) {
      this.swarmMetrics.set(swarmId, filteredMetrics);
      this.emit('retention:applied', {
        swarmId,
        removedCount: metrics.length - filteredMetrics.length
      });
    }
  }

  /**
   * Compress old metrics
   */
  private async compressMetrics(): Promise<void> {
    // Implementation would depend on storage backend
    // For now, just emit event
    this.emit('compression:triggered');
  }

  /**
   * Create empty resource usage
   */
  private createEmptyResourceUsage(): ResourceUsage {
    const emptyMetric = {
      current: 0,
      peak: 0,
      average: 0,
      unit: '',
      utilization: 0,
      timestamps: [],
      values: []
    };

    return {
      cpu: { ...emptyMetric, unit: 'percent' },
      memory: { ...emptyMetric, unit: 'bytes' },
      network: { ...emptyMetric, unit: 'bytes/s' },
      storage: { ...emptyMetric, unit: 'bytes' }
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopCollection();
    this.metrics.clear();
    this.swarmMetrics.clear();
    this.removeAllListeners();
  }
}