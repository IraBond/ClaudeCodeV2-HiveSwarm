#!/usr/bin/env node

/**
 * Enhanced Performance Collector with Marley Memory Bridge Integration
 * Collects comprehensive metrics from swarm operations and memory synchronization
 */

import { EventEmitter } from 'events';
import { 
  PerformanceMetric, 
  MetricType, 
  MetricSource,
  CollectorConfig,
  SamplingStrategy,
  MetricBuffer
} from './interfaces.js';
import { MarleyMemoryBridge, MarleyMemoryMetrics } from './marley-memory-integration.js';

export interface EnhancedCollectorConfig extends CollectorConfig {
  marleyEndpoint?: string;
  enableMemoryMetrics?: boolean;
  spectralAnalysisInterval?: number;
  memoryHealthCheckInterval?: number;
}

export class EnhancedPerformanceCollector extends EventEmitter {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private buffer: MetricBuffer = [];
  private marleyBridge: MarleyMemoryBridge | null = null;
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;
  private memoryHealthTimer: NodeJS.Timeout | null = null;
  
  constructor(private config: EnhancedCollectorConfig) {
    super();
    
    if (config.enableMemoryMetrics) {
      this.initializeMarleyIntegration();
    }
    
    this.setupCollectionStrategies();
  }

  private async initializeMarleyIntegration(): Promise<void> {
    try {
      this.marleyBridge = new MarleyMemoryBridge(
        this.config.marleyEndpoint || 'ws://localhost:8080/ws/memory-sync',
        this
      );

      // Set up event handlers
      this.marleyBridge.on('metrics', (memoryMetrics: MarleyMemoryMetrics) => {
        this.handleMarleyMetrics(memoryMetrics);
      });

      this.marleyBridge.on('sync_complete', (event) => {
        this.emit('memory_sync_complete', event);
        console.log(`🌀 Memory sync metrics collected: ${event.nodeCount} nodes`);
      });

      this.marleyBridge.on('error', (error) => {
        console.error('Marley Bridge error:', error);
        this.emit('memory_error', error);
      });

      // Connect to Marley
      await this.marleyBridge.connect();
      console.log('✅ Enhanced collector connected to Marley Memory Bridge');
      
      this.startMemoryHealthMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize Marley integration:', error);
      this.emit('error', error);
    }
  }

  private handleMarleyMetrics(memoryMetrics: MarleyMemoryMetrics): void {
    const timestamp = Date.now();
    
    // Collect memory usage metrics
    this.collectMetric({
      id: `memory-usage-${timestamp}`,
      timestamp,
      source: MetricSource.MEMORY,
      type: MetricType.MEMORY_USAGE,
      value: memoryMetrics.heapUsed,
      unit: 'bytes',
      tags: {
        type: 'heap_used',
        total: memoryMetrics.heapTotal.toString()
      },
      metadata: { memoryMetrics }
    });

    // Collect spectral alignment metrics
    this.collectMetric({
      id: `spectral-frequency-${timestamp}`,
      timestamp,
      source: MetricSource.NEURAL,
      type: MetricType.NEURAL_PROCESSING_TIME,
      value: memoryMetrics.spectralAlignment.frequency,
      unit: 'frequency',
      tags: {
        resonance_threads: memoryMetrics.spectralAlignment.resonanceThreads.toString(),
        connection_density: memoryMetrics.spectralAlignment.connectionDensity.toString()
      },
      metadata: { spectralAlignment: memoryMetrics.spectralAlignment }
    });

    // Collect memory node processing metrics
    this.collectMetric({
      id: `node-processing-${timestamp}`,
      timestamp,
      source: MetricSource.MEMORY,
      type: MetricType.MEMORY_SYNC_DURATION,
      value: memoryMetrics.memoryNodeProcessing.averageProcessingTime,
      unit: 'ms',
      tags: {
        nodes_per_second: memoryMetrics.memoryNodeProcessing.nodesPerSecond.toString(),
        harmonization_time: memoryMetrics.memoryNodeProcessing.harmonizationTime.toString()
      },
      metadata: { nodeProcessing: memoryMetrics.memoryNodeProcessing }
    });

    // Collect Airtable performance metrics
    this.collectMetric({
      id: `airtable-perf-${timestamp}`,
      timestamp,
      source: MetricSource.EXTERNAL,
      type: MetricType.EXTERNAL_SERVICE_LATENCY,
      value: memoryMetrics.airtablePerformance.apiLatency,
      unit: 'ms',
      tags: {
        service: 'airtable',
        error_rate: memoryMetrics.airtablePerformance.errorRate.toString(),
        success_rate: memoryMetrics.airtablePerformance.syncSuccessRate.toString()
      },
      metadata: { airtablePerformance: memoryMetrics.airtablePerformance }
    });

    // Collect cross-platform compatibility metrics
    this.collectMetric({
      id: `compatibility-${timestamp}`,
      timestamp,
      source: MetricSource.SYSTEM,
      type: MetricType.SYSTEM_PERFORMANCE_SCORE,
      value: memoryMetrics.crossPlatformCompatibility.overallCompatibilityScore,
      unit: 'score',
      tags: {
        obsidian: memoryMetrics.crossPlatformCompatibility.obsidianCompatibility.toString(),
        github: memoryMetrics.crossPlatformCompatibility.githubCompatibility.toString(),
        hugo: memoryMetrics.crossPlatformCompatibility.hugoCompatibility.toString(),
        pandoc: memoryMetrics.crossPlatformCompatibility.pandocCompatibility.toString()
      },
      metadata: { compatibility: memoryMetrics.crossPlatformCompatibility }
    });
  }

  private startMemoryHealthMonitoring(): void {
    if (this.memoryHealthTimer) {
      clearInterval(this.memoryHealthTimer);
    }

    this.memoryHealthTimer = setInterval(async () => {
      if (this.marleyBridge) {
        const health = this.marleyBridge.getConnectionHealth();
        const timestamp = Date.now();

        // Collect connection health metrics
        this.collectMetric({
          id: `memory-health-${timestamp}`,
          timestamp,
          source: MetricSource.SYSTEM,
          type: MetricType.SYSTEM_HEALTH,
          value: health.connected ? 1 : 0,
          unit: 'boolean',
          tags: {
            messages_sent: health.messagesSent.toString(),
            messages_received: health.messagesReceived.toString(),
            errors: health.errorsCount.toString()
          },
          metadata: { connectionHealth: health }
        });

        // Request periodic memory sync for metrics
        if (health.connected && Date.now() - health.lastHeartbeat > 60000) {
          try {
            await this.marleyBridge.requestMemorySync();
          } catch (error) {
            console.error('Failed to request memory sync:', error);
          }
        }
      }
    }, this.config.memoryHealthCheckInterval || 30000);
  }

  private setupCollectionStrategies(): void {
    // Enhanced collection with memory-aware sampling
    if (this.config.samplingStrategy === SamplingStrategy.ADAPTIVE) {
      this.setupAdaptiveMemoryCollection();
    }
  }

  private setupAdaptiveMemoryCollection(): void {
    // Adjust collection frequency based on memory activity
    this.on('memory_sync_complete', (event) => {
      if (event.nodeCount > 100) {
        // High activity - increase collection frequency
        this.adjustCollectionInterval(1000);
      } else if (event.nodeCount < 10) {
        // Low activity - decrease collection frequency  
        this.adjustCollectionInterval(10000);
      }
    });
  }

  private adjustCollectionInterval(newInterval: number): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, newInterval);
  }

  collectMetric(metric: PerformanceMetric): void {
    // Enhanced metric collection with memory context
    if (this.marleyBridge && this.marleyBridge.isConnected()) {
      const memoryHealth = this.marleyBridge.getConnectionHealth();
      metric.metadata = {
        ...metric.metadata,
        memoryBridgeConnected: true,
        memoryBridgeHealth: memoryHealth
      };
    }

    this.metrics.set(metric.id, metric);
    this.buffer.push(metric);
    
    // Apply buffer management
    if (this.buffer.length > this.config.bufferSize) {
      this.flushBuffer();
    }

    this.emit('metric_collected', metric);
  }

  async startCollection(): Promise<void> {
    if (this.isCollecting) {
      return;
    }

    console.log('🚀 Starting enhanced performance collection with Marley integration');
    this.isCollecting = true;

    // Start periodic system metrics collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectMemorySpecificMetrics();
    }, this.config.collectionInterval);

    // Start spectral analysis if enabled
    if (this.config.spectralAnalysisInterval && this.marleyBridge) {
      setInterval(async () => {
        await this.performSpectralAnalysis();
      }, this.config.spectralAnalysisInterval);
    }

    this.emit('collection_started');
  }

  private collectSystemMetrics(): void {
    const timestamp = Date.now();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // System memory
    this.collectMetric({
      id: `system-memory-${timestamp}`,
      timestamp,
      source: MetricSource.SYSTEM,
      type: MetricType.MEMORY_USAGE,
      value: memUsage.heapUsed,
      unit: 'bytes',
      tags: { type: 'system' },
      metadata: { memoryUsage: memUsage }
    });

    // System CPU
    this.collectMetric({
      id: `system-cpu-${timestamp}`,
      timestamp,
      source: MetricSource.SYSTEM,
      type: MetricType.CPU_USAGE,
      value: cpuUsage.user + cpuUsage.system,
      unit: 'microseconds',
      tags: { type: 'system' },
      metadata: { cpuUsage }
    });
  }

  private async collectMemorySpecificMetrics(): Promise<void> {
    if (!this.marleyBridge || !this.marleyBridge.isConnected()) {
      return;
    }

    const timestamp = Date.now();
    const memoryMetrics = this.marleyBridge.getMemoryMetrics();
    
    if (memoryMetrics.length > 0) {
      const latest = memoryMetrics[memoryMetrics.length - 1];
      
      // Collect cache performance
      this.collectMetric({
        id: `cache-performance-${timestamp}`,
        timestamp,
        source: MetricSource.MEMORY,
        type: MetricType.CACHE_PERFORMANCE,
        value: latest.cacheHitRatio,
        unit: 'ratio',
        tags: { 
          type: 'memory_cache',
          efficiency: latest.cacheHitRatio > 0.8 ? 'high' : 'low'
        },
        metadata: { cacheMetrics: latest }
      });
    }
  }

  private async performSpectralAnalysis(): Promise<void> {
    if (!this.marleyBridge || !this.marleyBridge.isConnected()) {
      return;
    }

    try {
      // Analyze sample content for spectral patterns
      const sampleContent = this.generateSampleContent();
      await this.marleyBridge.requestSpectralAnalysis(sampleContent);
    } catch (error) {
      console.error('Failed to perform spectral analysis:', error);
    }
  }

  private generateSampleContent(): string {
    return `# Sample Content Analysis
    
This is sample content for spectral analysis to measure:
- [[Link performance]]
- Connection density
- Structural depth
- Resonance patterns

## Metrics Collection
- Performance tracking
- Memory synchronization
- Cross-platform compatibility

#performance #memory #spectral-analysis`;
  }

  async requestMemorySync(): Promise<void> {
    if (this.marleyBridge && this.marleyBridge.isConnected()) {
      await this.marleyBridge.requestMemorySync();
    } else {
      throw new Error('Marley Memory Bridge not connected');
    }
  }

  async requestHarmonization(content: string, targetFormat?: string): Promise<void> {
    if (this.marleyBridge && this.marleyBridge.isConnected()) {
      await this.marleyBridge.requestHarmonization(content, targetFormat);
    } else {
      throw new Error('Marley Memory Bridge not connected');
    }
  }

  getMemoryBridgeStatus(): any {
    return this.marleyBridge ? {
      connected: this.marleyBridge.isConnected(),
      health: this.marleyBridge.getConnectionHealth(),
      metrics: this.marleyBridge.getMemoryMetrics().length
    } : {
      connected: false,
      enabled: this.config.enableMemoryMetrics || false
    };
  }

  private flushBuffer(): void {
    // Process buffered metrics
    const metricsToFlush = this.buffer.splice(0, this.config.bufferSize / 2);
    
    // Emit batch of metrics
    this.emit('metrics_batch', metricsToFlush);
    
    console.log(`📊 Flushed ${metricsToFlush.length} metrics from buffer`);
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetricsBySource(source: MetricSource): PerformanceMetric[] {
    return this.getMetrics().filter(metric => metric.source === source);
  }

  getMetricsByType(type: MetricType): PerformanceMetric[] {
    return this.getMetrics().filter(metric => metric.type === type);
  }

  async stopCollection(): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    console.log('⏹️ Stopping enhanced performance collection');
    this.isCollecting = false;

    // Clear intervals
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    if (this.memoryHealthTimer) {
      clearInterval(this.memoryHealthTimer);
      this.memoryHealthTimer = null;
    }

    // Disconnect from Marley
    if (this.marleyBridge) {
      await this.marleyBridge.disconnect();
    }

    // Flush remaining metrics
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }

    this.emit('collection_stopped');
  }

  // Get comprehensive performance summary including memory metrics
  getPerformanceSummary(): any {
    const allMetrics = this.getMetrics();
    const memoryMetrics = this.getMetricsBySource(MetricSource.MEMORY);
    const systemMetrics = this.getMetricsBySource(MetricSource.SYSTEM);
    const neuralMetrics = this.getMetricsBySource(MetricSource.NEURAL);

    return {
      totalMetrics: allMetrics.length,
      memoryMetrics: memoryMetrics.length,
      systemMetrics: systemMetrics.length,
      neuralMetrics: neuralMetrics.length,
      marleyBridge: this.getMemoryBridgeStatus(),
      timeRange: {
        start: Math.min(...allMetrics.map(m => m.timestamp)),
        end: Math.max(...allMetrics.map(m => m.timestamp))
      },
      averages: {
        memoryUsage: this.calculateAverage(memoryMetrics, 'value'),
        processingTime: this.calculateAverage(
          allMetrics.filter(m => m.type === MetricType.MEMORY_SYNC_DURATION),
          'value'
        ),
        spectralFrequency: this.calculateAverage(
          neuralMetrics.filter(m => m.tags?.frequency),
          'value'
        )
      }
    };
  }

  private calculateAverage(metrics: PerformanceMetric[], field: keyof PerformanceMetric): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[field] as number || 0), 0);
    return sum / metrics.length;
  }
}

export default EnhancedPerformanceCollector;