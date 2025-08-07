/**
 * Performance Analysis Service
 * Main orchestrator for performance analysis operations
 */

import { EventEmitter } from 'events';
import {
  PerformanceAnalysisResult,
  PerformanceAnalysisConfig,
  SwarmOperationMetrics,
  MetricQuery,
  TimeRange,
  PerformanceSummary,
  TrendAnalysis,
  Bottleneck,
  Recommendation,
  ResourceAnalysis,
  RecommendationType,
  Priority,
  HealthStatus,
  ImpactEstimation,
  ImplementationGuide
} from '../types';

import { MetricsCollector } from '../core/MetricsCollector';
import { StatisticalAnalyzer } from '../analysis/StatisticalAnalyzer';
import { TrendAnalyzer } from '../analysis/TrendAnalyzer';
import { ResourceAnalyzer } from '../analysis/ResourceAnalyzer';
import { BottleneckDetector } from '../analysis/BottleneckDetector';

export class PerformanceAnalysisService extends EventEmitter {
  private metricsCollector: MetricsCollector;
  private statisticalAnalyzer: StatisticalAnalyzer;
  private trendAnalyzer: TrendAnalyzer;
  private resourceAnalyzer: ResourceAnalyzer;
  private bottleneckDetector: BottleneckDetector;
  private config: PerformanceAnalysisConfig;
  private analysisTimer?: NodeJS.Timer;

  constructor(config: PerformanceAnalysisConfig) {
    super();
    this.config = config;
    
    this.metricsCollector = new MetricsCollector(
      config.sampling,
      config.storage
    );
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
    this.resourceAnalyzer = new ResourceAnalyzer();
    this.bottleneckDetector = new BottleneckDetector();

    this.setupEventListeners();
    this.startPeriodicAnalysis();
  }

  /**
   * Perform comprehensive performance analysis
   */
  async analyzePerformance(timeRange?: TimeRange): Promise<PerformanceAnalysisResult> {
    try {
      const analysisId = this.generateAnalysisId();
      const analysisTimeRange = timeRange || this.getDefaultTimeRange();
      
      this.emit('analysis:started', { analysisId, timeRange: analysisTimeRange });

      // Gather all metrics for analysis
      const swarmIds = this.metricsCollector.getSwarmIds();
      const allSwarmMetrics: SwarmOperationMetrics[] = [];

      for (const swarmId of swarmIds) {
        const metrics = await this.metricsCollector.getSwarmMetrics(swarmId, analysisTimeRange);
        allSwarmMetrics.push(...metrics);
      }

      if (allSwarmMetrics.length === 0) {
        throw new Error('No metrics available for analysis');
      }

      // Perform analysis components
      const [summary, trends, bottlenecks, resourceAnalysis, recommendations] = await Promise.all([
        this.generatePerformanceSummary(allSwarmMetrics),
        this.analyzeTrends(allSwarmMetrics, analysisTimeRange),
        this.detectBottlenecks(allSwarmMetrics),
        this.analyzeResources(allSwarmMetrics, analysisTimeRange),
        this.generateRecommendations(allSwarmMetrics)
      ]);

      const result: PerformanceAnalysisResult = {
        analysisId,
        timestamp: Date.now(),
        timeRange: analysisTimeRange,
        summary,
        trends,
        bottlenecks,
        recommendations,
        resourceAnalysis,
        metadata: {
          totalOperations: allSwarmMetrics.length,
          swarmCount: swarmIds.length,
          analysisVersion: '1.0.0'
        }
      };

      this.emit('analysis:completed', { analysisId, result });
      
      // Check for alerts
      await this.checkAndTriggerAlerts(result);

      return result;

    } catch (error) {
      this.emit('analysis:error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Analyze specific swarm performance
   */
  async analyzeSwarmPerformance(
    swarmId: string, 
    timeRange?: TimeRange
  ): Promise<PerformanceAnalysisResult> {
    try {
      const analysisTimeRange = timeRange || this.getDefaultTimeRange();
      const swarmMetrics = await this.metricsCollector.getSwarmMetrics(swarmId, analysisTimeRange);

      if (swarmMetrics.length === 0) {
        throw new Error(`No metrics found for swarm: ${swarmId}`);
      }

      return await this.analyzeMetrics(swarmMetrics, analysisTimeRange, swarmId);

    } catch (error) {
      this.emit('swarm:analysis:error', { swarmId, error: error as Error });
      throw error;
    }
  }

  /**
   * Get real-time performance status
   */
  async getPerformanceStatus(): Promise<{
    health: HealthStatus;
    activeBottlenecks: number;
    totalOperations: number;
    averageLatency: number;
    errorRate: number;
    resourceUtilization: number;
  }> {
    try {
      const recentTimeRange = {
        start: Date.now() - 300000, // Last 5 minutes
        end: Date.now(),
        duration: 300000
      };

      const swarmIds = this.metricsCollector.getSwarmIds();
      const recentMetrics: SwarmOperationMetrics[] = [];

      for (const swarmId of swarmIds) {
        const metrics = await this.metricsCollector.getSwarmMetrics(swarmId, recentTimeRange);
        recentMetrics.push(...metrics);
      }

      if (recentMetrics.length === 0) {
        return {
          health: HealthStatus.GOOD,
          activeBottlenecks: 0,
          totalOperations: 0,
          averageLatency: 0,
          errorRate: 0,
          resourceUtilization: 0
        };
      }

      const bottlenecks = await this.detectBottlenecks(recentMetrics);
      const avgLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
      const avgErrorRate = recentMetrics.reduce((sum, m) => sum + (1 - m.successRate), 0) / recentMetrics.length;
      
      // Simplified resource utilization calculation
      const resourceUtil = recentMetrics.reduce((sum, m) => {
        const avgUtil = (m.resourceUsage.cpu.utilization + 
                        m.resourceUsage.memory.utilization + 
                        m.resourceUsage.network.utilization + 
                        m.resourceUsage.storage.utilization) / 4;
        return sum + avgUtil;
      }, 0) / recentMetrics.length;

      const health = this.calculateHealthStatus(avgLatency, avgErrorRate, resourceUtil, bottlenecks);

      return {
        health,
        activeBottlenecks: bottlenecks.length,
        totalOperations: recentMetrics.length,
        averageLatency: avgLatency,
        errorRate: avgErrorRate,
        resourceUtilization: resourceUtil
      };

    } catch (error) {
      this.emit('status:error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(
    query: MetricQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const metrics = await this.metricsCollector.getMetrics(query);
      
      if (format === 'csv') {
        return this.convertToCsv(metrics);
      }
      
      return JSON.stringify(metrics, null, 2);

    } catch (error) {
      this.emit('export:error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Get performance insights for a specific metric type
   */
  async getMetricInsights(metricType: string, timeRange?: TimeRange): Promise<{
    summary: any;
    trends: TrendAnalysis[];
    anomalies: Array<{ timestamp: number; value: number; score: number }>;
    correlations: any[];
  }> {
    try {
      const analysisTimeRange = timeRange || this.getDefaultTimeRange();
      const query: MetricQuery = {
        timeRange: analysisTimeRange,
        metricTypes: [metricType as any]
      };

      const metrics = await this.metricsCollector.getMetrics(query);
      
      if (metrics.length === 0) {
        throw new Error(`No metrics found for type: ${metricType}`);
      }

      const values = metrics.map(m => m.value);
      const timestamps = metrics.map(m => m.timestamp);
      
      const summary = this.statisticalAnalyzer.calculateSummary(values);
      const timeSeriesData = { timestamps, values };
      const trendAnalysis = this.trendAnalyzer.detectTrends(timeSeriesData);
      const anomalies = this.trendAnalyzer.detectAnomalies(timeSeriesData);

      // Get correlations with other metrics
      const allMetrics = await this.metricsCollector.getMetrics({ timeRange: analysisTimeRange });
      const correlations = this.calculateCrossMetricCorrelations(metrics, allMetrics);

      return {
        summary,
        trends: [trendAnalysis],
        anomalies: anomalies.anomalies,
        correlations
      };

    } catch (error) {
      this.emit('insights:error', { metricType, error: error as Error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private setupEventListeners(): void {
    this.metricsCollector.on('error', (event) => {
      this.emit('collector:error', event);
    });

    this.metricsCollector.on('metrics:collected', (event) => {
      this.emit('metrics:collected', event);
    });
  }

  private startPeriodicAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    const intervalMs = this.config.analysis.windowSize * 60 * 1000; // Convert minutes to ms
    
    this.analysisTimer = setInterval(async () => {
      try {
        await this.analyzePerformance();
      } catch (error) {
        this.emit('periodic:analysis:error', { error: error as Error });
      }
    }, intervalMs);
  }

  private async analyzeMetrics(
    metrics: SwarmOperationMetrics[],
    timeRange: TimeRange,
    swarmId?: string
  ): Promise<PerformanceAnalysisResult> {
    const analysisId = this.generateAnalysisId();
    
    const [summary, trends, bottlenecks, resourceAnalysis, recommendations] = await Promise.all([
      this.generatePerformanceSummary(metrics),
      this.analyzeTrends(metrics, timeRange),
      this.detectBottlenecks(metrics),
      this.analyzeResources(metrics, timeRange),
      this.generateRecommendations(metrics)
    ]);

    return {
      analysisId,
      timestamp: Date.now(),
      timeRange,
      summary,
      trends,
      bottlenecks,
      recommendations,
      resourceAnalysis,
      metadata: {
        swarmId,
        totalOperations: metrics.length,
        analysisVersion: '1.0.0'
      }
    };
  }

  private async generatePerformanceSummary(metrics: SwarmOperationMetrics[]): Promise<PerformanceSummary> {
    const totalOps = metrics.length;
    const successfulOps = metrics.filter(m => m.successRate > 0.95).length;
    const failedOps = totalOps - successfulOps;

    const latencies = metrics.map(m => m.latency);
    const throughputs = metrics.map(m => m.throughput);
    
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
    const peakThroughput = Math.max(...throughputs);

    // Calculate resource efficiency
    const resourceEfficiencies = metrics.map(m => {
      const cpu = m.resourceUsage.cpu.utilization;
      const memory = m.resourceUsage.memory.utilization;
      const network = m.resourceUsage.network.utilization;
      const storage = m.resourceUsage.storage.utilization;
      return (cpu + memory + network + storage) / 4;
    });
    
    const avgResourceEfficiency = resourceEfficiencies.reduce((sum, e) => sum + e, 0) / resourceEfficiencies.length / 100;

    const health = this.calculateOverallHealth(metrics);

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      averageLatency: avgLatency,
      averageThroughput: avgThroughput,
      peakThroughput: peakThroughput,
      resourceEfficiency: avgResourceEfficiency,
      overallHealth: health
    };
  }

  private async analyzeTrends(
    metrics: SwarmOperationMetrics[],
    timeRange: TimeRange
  ): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    // Analyze latency trends
    const latencyData = {
      timestamps: metrics.map(m => m.startTime),
      values: metrics.map(m => m.latency)
    };

    if (latencyData.values.length > 0) {
      const latencyTrend = this.trendAnalyzer.detectTrends(latencyData);
      trends.push(latencyTrend);
    }

    // Analyze throughput trends
    const throughputData = {
      timestamps: metrics.map(m => m.startTime),
      values: metrics.map(m => m.throughput)
    };

    if (throughputData.values.length > 0) {
      const throughputTrend = this.trendAnalyzer.detectTrends(throughputData);
      trends.push(throughputTrend);
    }

    // Analyze error rate trends
    const errorData = {
      timestamps: metrics.map(m => m.startTime),
      values: metrics.map(m => 1 - m.successRate)
    };

    if (errorData.values.length > 0) {
      const errorTrend = this.trendAnalyzer.detectTrends(errorData);
      trends.push(errorTrend);
    }

    return trends;
  }

  private async detectBottlenecks(metrics: SwarmOperationMetrics[]): Promise<Bottleneck[]> {
    const operationBottlenecks = this.bottleneckDetector.detectBottlenecks(metrics);
    const antiPatterns = this.bottleneckDetector.identifyPerformanceAntipatterns(metrics);
    
    // Extract resource usage for resource bottleneck analysis
    const resourceUsage = metrics.map(m => m.resourceUsage);
    const resourceBottlenecks = this.bottleneckDetector.analyzeResourceBottlenecks(resourceUsage);

    return [...operationBottlenecks, ...antiPatterns, ...resourceBottlenecks];
  }

  private async analyzeResources(
    metrics: SwarmOperationMetrics[],
    timeRange: TimeRange
  ): Promise<ResourceAnalysis> {
    // Extract resource metrics
    const resourceMetrics = metrics.flatMap(m => [
      m.resourceUsage.cpu,
      m.resourceUsage.memory,
      m.resourceUsage.network,
      m.resourceUsage.storage
    ]);

    return this.resourceAnalyzer.analyzeUtilization(resourceMetrics, timeRange);
  }

  private async generateRecommendations(metrics: SwarmOperationMetrics[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Performance optimization recommendations
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
    if (avgLatency > 5000) { // 5 seconds
      recommendations.push({
        id: this.generateRecommendationId(),
        type: RecommendationType.OPTIMIZATION,
        priority: Priority.HIGH,
        title: 'Optimize High Latency Operations',
        description: `Average latency is ${avgLatency.toFixed(0)}ms, which is above the recommended threshold.`,
        expectedImpact: {
          performance: 30, // 30% improvement expected
          efficiency: 20,
          cost: 40, // 40 hours implementation
          timeframe: 7 // 7 days
        },
        implementation: {
          steps: [
            'Profile operations to identify slow components',
            'Implement caching where appropriate',
            'Optimize database queries and indexes',
            'Consider asynchronous processing for long operations'
          ],
          estimatedEffort: 40,
          prerequisites: ['Performance profiling tools', 'Database access'],
          risks: ['Potential compatibility issues', 'Temporary performance degradation during implementation']
        },
        validatedAt: Date.now()
      });
    }

    // Scaling recommendations
    const avgAgentCount = metrics.reduce((sum, m) => sum + m.agentCount, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
    const throughputPerAgent = avgThroughput / avgAgentCount;

    if (throughputPerAgent < 50) { // Low throughput per agent
      recommendations.push({
        id: this.generateRecommendationId(),
        type: RecommendationType.SCALING,
        priority: Priority.MEDIUM,
        title: 'Improve Agent Utilization',
        description: `Average throughput per agent is ${throughputPerAgent.toFixed(1)} ops/s, indicating potential underutilization.`,
        expectedImpact: {
          performance: 25,
          efficiency: 35,
          cost: 20,
          timeframe: 3
        },
        implementation: {
          steps: [
            'Analyze agent workload distribution',
            'Implement dynamic load balancing',
            'Optimize task assignment algorithms',
            'Consider reducing agent count if underutilized'
          ],
          estimatedEffort: 20,
          prerequisites: ['Agent monitoring capabilities'],
          risks: ['Potential system instability during rebalancing']
        },
        validatedAt: Date.now()
      });
    }

    // Error handling recommendations
    const avgErrorRate = metrics.reduce((sum, m) => sum + (1 - m.successRate), 0) / metrics.length;
    if (avgErrorRate > 0.05) { // More than 5% error rate
      recommendations.push({
        id: this.generateRecommendationId(),
        type: RecommendationType.OPTIMIZATION,
        priority: Priority.HIGH,
        title: 'Reduce System Error Rate',
        description: `Current error rate is ${(avgErrorRate * 100).toFixed(1)}%, above the recommended 5% threshold.`,
        expectedImpact: {
          performance: 20,
          efficiency: 15,
          cost: 30,
          timeframe: 5
        },
        implementation: {
          steps: [
            'Analyze error patterns and root causes',
            'Implement comprehensive error handling',
            'Add circuit breakers for failing operations',
            'Improve system resilience and fault tolerance'
          ],
          estimatedEffort: 30,
          prerequisites: ['Error logging and monitoring'],
          risks: ['May initially increase latency', 'Complex implementation']
        },
        validatedAt: Date.now()
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateHealthStatus(
    latency: number,
    errorRate: number,
    resourceUtil: number,
    bottlenecks: Bottleneck[]
  ): HealthStatus {
    let score = 100;

    // Latency impact
    if (latency > 10000) score -= 40; // 10s+ is critical
    else if (latency > 5000) score -= 25; // 5s+ is major
    else if (latency > 2000) score -= 10; // 2s+ is moderate

    // Error rate impact
    if (errorRate > 0.2) score -= 35; // 20%+ is critical
    else if (errorRate > 0.1) score -= 20; // 10%+ is major
    else if (errorRate > 0.05) score -= 10; // 5%+ is moderate

    // Resource utilization impact
    if (resourceUtil > 95) score -= 30; // 95%+ is critical
    else if (resourceUtil > 85) score -= 15; // 85%+ is concerning
    else if (resourceUtil > 75) score -= 5; // 75%+ is moderate

    // Bottleneck impact
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length;
    const majorBottlenecks = bottlenecks.filter(b => b.severity === 'major').length;
    
    score -= criticalBottlenecks * 20;
    score -= majorBottlenecks * 10;

    // Determine health status
    if (score >= 90) return HealthStatus.EXCELLENT;
    if (score >= 75) return HealthStatus.GOOD;
    if (score >= 60) return HealthStatus.FAIR;
    if (score >= 40) return HealthStatus.POOR;
    return HealthStatus.CRITICAL;
  }

  private calculateOverallHealth(metrics: SwarmOperationMetrics[]): HealthStatus {
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + (1 - m.successRate), 0) / metrics.length;
    const avgResourceUtil = metrics.reduce((sum, m) => {
      return sum + (m.resourceUsage.cpu.utilization + m.resourceUsage.memory.utilization) / 2;
    }, 0) / metrics.length;

    return this.calculateHealthStatus(avgLatency, avgErrorRate, avgResourceUtil, []);
  }

  private async checkAndTriggerAlerts(result: PerformanceAnalysisResult): Promise<void> {
    if (!this.config.alerting.enabled) return;

    const { summary, bottlenecks } = result;
    
    // Check for critical conditions
    if (summary.overallHealth === HealthStatus.CRITICAL) {
      this.emit('alert:critical', {
        type: 'health',
        message: 'System health is critical',
        data: summary
      });
    }

    // Check for critical bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      this.emit('alert:bottleneck', {
        type: 'bottleneck',
        message: `${criticalBottlenecks.length} critical bottlenecks detected`,
        data: criticalBottlenecks
      });
    }

    // Check threshold-based alerts
    const thresholds = this.config.alerting.thresholds;
    
    if (summary.averageLatency > (thresholds.latency || 5000)) {
      this.emit('alert:latency', {
        type: 'latency',
        message: `High latency detected: ${summary.averageLatency}ms`,
        data: { latency: summary.averageLatency, threshold: thresholds.latency }
      });
    }

    if ((summary.failedOperations / summary.totalOperations) > (thresholds.errorRate || 0.05)) {
      const errorRate = summary.failedOperations / summary.totalOperations;
      this.emit('alert:errorRate', {
        type: 'errorRate',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        data: { errorRate, threshold: thresholds.errorRate }
      });
    }
  }

  private calculateCrossMetricCorrelations(targetMetrics: any[], allMetrics: any[]): any[] {
    // Simplified correlation calculation
    const correlations: any[] = [];
    
    // Group metrics by type
    const metricGroups = allMetrics.reduce((groups, metric) => {
      if (!groups[metric.metricType]) {
        groups[metric.metricType] = [];
      }
      groups[metric.metricType].push(metric.value);
      return groups;
    }, {});

    const targetValues = targetMetrics.map(m => m.value);
    const datasets: Record<string, number[]> = { target: targetValues };

    // Add other metric types with matching lengths
    for (const [type, values] of Object.entries(metricGroups)) {
      if ((values as number[]).length === targetValues.length) {
        datasets[type] = values as number[];
      }
    }

    const correlationResults = this.statisticalAnalyzer.calculateCorrelations(datasets);
    return correlationResults.filter(c => c.metric1 === 'target' || c.metric2 === 'target');
  }

  private convertToCsv(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `recommendation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultTimeRange(): TimeRange {
    const end = Date.now();
    const start = end - (this.config.analysis.trendAnalysisWindow * 60 * 60 * 1000); // Convert hours to ms
    return {
      start,
      end,
      duration: end - start
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    this.metricsCollector.cleanup();
    this.removeAllListeners();
  }
}