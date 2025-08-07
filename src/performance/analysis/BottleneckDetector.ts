/**
 * Bottleneck Detection Engine
 * Identifies performance bottlenecks and anti-patterns in swarm operations
 */

import {
  Bottleneck,
  SwarmOperationMetrics,
  ResourceUsage,
  IBottleneckDetector,
  BottleneckType,
  BottleneckSeverity,
  ImpactAnalysis,
  ImpactScope,
  BottleneckDetectionConfig,
  MetricType,
  SwarmOperationType,
  ErrorSeverity
} from '../types';

export class BottleneckDetector implements IBottleneckDetector {
  private readonly DEFAULT_CONFIG: BottleneckDetectionConfig = {
    cpuThreshold: 80,        // 80% CPU utilization
    memoryThreshold: 85,     // 85% Memory utilization
    latencyThreshold: 5000,  // 5 seconds
    errorRateThreshold: 0.05, // 5% error rate
    throughputThreshold: 0.5  // 50% of expected throughput
  };

  private readonly SEVERITY_THRESHOLDS = {
    [BottleneckSeverity.MINOR]: 0.2,
    [BottleneckSeverity.MODERATE]: 0.5,
    [BottleneckSeverity.MAJOR]: 0.75,
    [BottleneckSeverity.CRITICAL]: 0.9
  };

  /**
   * Detect bottlenecks in swarm operations
   */
  detectBottlenecks(
    metrics: SwarmOperationMetrics[],
    config: BottleneckDetectionConfig = this.DEFAULT_CONFIG
  ): Bottleneck[] {
    if (metrics.length === 0) {
      return [];
    }

    const bottlenecks: Bottleneck[] = [];

    // Detect different types of bottlenecks
    bottlenecks.push(...this.detectLatencyBottlenecks(metrics, config));
    bottlenecks.push(...this.detectThroughputBottlenecks(metrics, config));
    bottlenecks.push(...this.detectErrorRateBottlenecks(metrics, config));
    bottlenecks.push(...this.detectConcurrencyBottlenecks(metrics));
    bottlenecks.push(...this.detectCoordinationBottlenecks(metrics));
    bottlenecks.push(...this.detectSerializationBottlenecks(metrics));

    // Sort by severity and impact
    return bottlenecks.sort((a, b) => {
      const severityOrder = {
        [BottleneckSeverity.CRITICAL]: 4,
        [BottleneckSeverity.MAJOR]: 3,
        [BottleneckSeverity.MODERATE]: 2,
        [BottleneckSeverity.MINOR]: 1
      };
      
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      
      return b.impact.severity - a.impact.severity;
    });
  }

  /**
   * Analyze resource bottlenecks
   */
  analyzeResourceBottlenecks(resourceUsage: ResourceUsage[]): Bottleneck[] {
    if (resourceUsage.length === 0) {
      return [];
    }

    const bottlenecks: Bottleneck[] = [];

    for (const usage of resourceUsage) {
      bottlenecks.push(...this.detectCpuBottlenecks(usage.cpu));
      bottlenecks.push(...this.detectMemoryBottlenecks(usage.memory));
      bottlenecks.push(...this.detectNetworkBottlenecks(usage.network));
      bottlenecks.push(...this.detectStorageBottlenecks(usage.storage));
    }

    return bottlenecks;
  }

  /**
   * Identify performance anti-patterns
   */
  identifyPerformanceAntipatterns(operations: SwarmOperationMetrics[]): Bottleneck[] {
    const antipatterns: Bottleneck[] = [];

    // Detect common anti-patterns
    antipatterns.push(...this.detectThunderingHerd(operations));
    antipatterns.push(...this.detectHotSpots(operations));
    antipatterns.push(...this.detectResourceLeaks(operations));
    antipatterns.push(...this.detectDeadlocks(operations));
    antipatterns.push(...this.detectLivelock(operations));
    antipatterns.push(...this.detectStarvation(operations));
    antipatterns.push(...this.detectCascadingFailures(operations));

    return antipatterns;
  }

  /**
   * Detect latency bottlenecks
   */
  private detectLatencyBottlenecks(
    metrics: SwarmOperationMetrics[],
    config: BottleneckDetectionConfig
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    for (const metric of metrics) {
      if (metric.latency > config.latencyThreshold) {
        const severity = this.calculateLatencySeverity(metric.latency, config.latencyThreshold);
        const impact = this.calculateLatencyImpact(metric);
        
        bottlenecks.push({
          id: this.generateBottleneckId('latency'),
          type: BottleneckType.SERIALIZATION, // High latency often indicates serialization issues
          severity,
          description: `High latency detected: ${metric.latency}ms (threshold: ${config.latencyThreshold}ms)`,
          affectedMetrics: [MetricType.LATENCY.toString()],
          rootCause: this.analyzeLatencyRootCause(metric),
          impact,
          suggestions: this.generateLatencySuggestions(metric),
          detectedAt: Date.now()
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect throughput bottlenecks
   */
  private detectThroughputBottlenecks(
    metrics: SwarmOperationMetrics[],
    config: BottleneckDetectionConfig
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Calculate expected throughput based on agent count and task complexity
    for (const metric of metrics) {
      const expectedThroughput = this.calculateExpectedThroughput(metric);
      const throughputRatio = metric.throughput / expectedThroughput;
      
      if (throughputRatio < config.throughputThreshold) {
        const severity = this.calculateThroughputSeverity(throughputRatio);
        const impact = this.calculateThroughputImpact(metric, expectedThroughput);
        
        bottlenecks.push({
          id: this.generateBottleneckId('throughput'),
          type: BottleneckType.CONCURRENCY,
          severity,
          description: `Low throughput detected: ${metric.throughput} ops/s (expected: ${expectedThroughput} ops/s)`,
          affectedMetrics: [MetricType.THROUGHPUT.toString()],
          rootCause: this.analyzeThroughputRootCause(metric, expectedThroughput),
          impact,
          suggestions: this.generateThroughputSuggestions(metric),
          detectedAt: Date.now()
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect error rate bottlenecks
   */
  private detectErrorRateBottlenecks(
    metrics: SwarmOperationMetrics[],
    config: BottleneckDetectionConfig
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    for (const metric of metrics) {
      const errorRate = 1 - metric.successRate;
      
      if (errorRate > config.errorRateThreshold) {
        const severity = this.calculateErrorRateSeverity(errorRate);
        const impact = this.calculateErrorRateImpact(metric, errorRate);
        
        bottlenecks.push({
          id: this.generateBottleneckId('error_rate'),
          type: this.determineErrorBottleneckType(metric.errors),
          severity,
          description: `High error rate detected: ${(errorRate * 100).toFixed(1)}% (threshold: ${(config.errorRateThreshold * 100).toFixed(1)}%)`,
          affectedMetrics: [MetricType.ERROR_RATE.toString(), MetricType.SUCCESS_RATE.toString()],
          rootCause: this.analyzeErrorRootCause(metric.errors),
          impact,
          suggestions: this.generateErrorSuggestions(metric.errors),
          detectedAt: Date.now()
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect concurrency bottlenecks
   */
  private detectConcurrencyBottlenecks(metrics: SwarmOperationMetrics[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Analyze agent utilization patterns
    for (const metric of metrics) {
      if (metric.agentCount > 1) {
        const parallelEfficiency = this.calculateParallelEfficiency(metric);
        
        if (parallelEfficiency < 0.6) { // Less than 60% parallel efficiency
          const severity = parallelEfficiency < 0.3 ? 
            BottleneckSeverity.MAJOR : BottleneckSeverity.MODERATE;
          
          bottlenecks.push({
            id: this.generateBottleneckId('concurrency'),
            type: BottleneckType.CONCURRENCY,
            severity,
            description: `Poor parallel efficiency: ${(parallelEfficiency * 100).toFixed(1)}% with ${metric.agentCount} agents`,
            affectedMetrics: [MetricType.AGENT_COUNT.toString(), MetricType.THROUGHPUT.toString()],
            rootCause: 'Insufficient parallelization or synchronization overhead',
            impact: this.calculateConcurrencyImpact(metric, parallelEfficiency),
            suggestions: [
              'Analyze task dependencies and reduce synchronization points',
              'Consider task decomposition strategies',
              'Review agent coordination mechanisms',
              'Implement work-stealing algorithms'
            ],
            detectedAt: Date.now()
          });
        }
      }
    }

    return bottlenecks;
  }

  /**
   * Detect coordination bottlenecks
   */
  private detectCoordinationBottlenecks(metrics: SwarmOperationMetrics[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    const coordinationOps = metrics.filter(m => 
      m.operationType === SwarmOperationType.COORDINATION ||
      m.operationType === SwarmOperationType.CONSENSUS
    );

    for (const metric of coordinationOps) {
      const coordinationOverhead = this.calculateCoordinationOverhead(metric);
      
      if (coordinationOverhead > 0.3) { // More than 30% overhead
        bottlenecks.push({
          id: this.generateBottleneckId('coordination'),
          type: BottleneckType.COORDINATION,
          severity: coordinationOverhead > 0.5 ? BottleneckSeverity.MAJOR : BottleneckSeverity.MODERATE,
          description: `High coordination overhead: ${(coordinationOverhead * 100).toFixed(1)}%`,
          affectedMetrics: [MetricType.LATENCY.toString(), MetricType.THROUGHPUT.toString()],
          rootCause: 'Excessive coordination or inefficient consensus algorithms',
          impact: this.calculateCoordinationImpact(metric, coordinationOverhead),
          suggestions: [
            'Optimize consensus algorithms',
            'Reduce coordination frequency',
            'Implement lazy coordination strategies',
            'Use eventual consistency where appropriate'
          ],
          detectedAt: Date.now()
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect serialization bottlenecks
   */
  private detectSerializationBottlenecks(metrics: SwarmOperationMetrics[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    for (const metric of metrics) {
      // Look for operations that should be parallelizable but show poor scaling
      if (metric.agentCount > 2) {
        const scalingEfficiency = this.calculateScalingEfficiency(metric);
        
        if (scalingEfficiency < 0.4) { // Poor scaling indicates serialization
          bottlenecks.push({
            id: this.generateBottleneckId('serialization'),
            type: BottleneckType.SERIALIZATION,
            severity: scalingEfficiency < 0.2 ? BottleneckSeverity.CRITICAL : BottleneckSeverity.MAJOR,
            description: `Poor scaling efficiency: ${(scalingEfficiency * 100).toFixed(1)}% with ${metric.agentCount} agents`,
            affectedMetrics: [MetricType.THROUGHPUT.toString(), MetricType.LATENCY.toString()],
            rootCause: 'Sequential bottlenecks or shared resource contention',
            impact: this.calculateSerializationImpact(metric, scalingEfficiency),
            suggestions: [
              'Identify and eliminate sequential bottlenecks',
              'Implement lock-free data structures',
              'Use partition-based processing',
              'Consider actor model patterns'
            ],
            detectedAt: Date.now()
          });
        }
      }
    }

    return bottlenecks;
  }

  /**
   * Detect CPU bottlenecks
   */
  private detectCpuBottlenecks(cpuMetric: any): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    if (cpuMetric.utilization > 90) {
      bottlenecks.push({
        id: this.generateBottleneckId('cpu'),
        type: BottleneckType.CPU,
        severity: cpuMetric.utilization > 95 ? BottleneckSeverity.CRITICAL : BottleneckSeverity.MAJOR,
        description: `High CPU utilization: ${cpuMetric.utilization.toFixed(1)}%`,
        affectedMetrics: [MetricType.RESOURCE_CPU.toString()],
        rootCause: 'CPU-intensive operations or insufficient CPU resources',
        impact: {
          scope: ImpactScope.SYSTEM,
          severity: cpuMetric.utilization / 100,
          affectedAgents: [],
          performanceDegradation: (cpuMetric.utilization - 70) / 30,
          estimatedCost: 0
        },
        suggestions: [
          'Optimize CPU-intensive algorithms',
          'Implement CPU affinity strategies',
          'Consider horizontal scaling',
          'Use profiling tools to identify hotspots'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  /**
   * Detect memory bottlenecks
   */
  private detectMemoryBottlenecks(memoryMetric: any): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    if (memoryMetric.utilization > 85) {
      bottlenecks.push({
        id: this.generateBottleneckId('memory'),
        type: BottleneckType.MEMORY,
        severity: memoryMetric.utilization > 95 ? BottleneckSeverity.CRITICAL : BottleneckSeverity.MAJOR,
        description: `High memory utilization: ${memoryMetric.utilization.toFixed(1)}%`,
        affectedMetrics: [MetricType.RESOURCE_MEMORY.toString()],
        rootCause: 'Memory-intensive operations or memory leaks',
        impact: {
          scope: ImpactScope.SYSTEM,
          severity: memoryMetric.utilization / 100,
          affectedAgents: [],
          performanceDegradation: (memoryMetric.utilization - 70) / 30,
          estimatedCost: 0
        },
        suggestions: [
          'Implement memory pooling strategies',
          'Optimize data structures',
          'Check for memory leaks',
          'Consider garbage collection tuning'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  /**
   * Detect network bottlenecks
   */
  private detectNetworkBottlenecks(networkMetric: any): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    if (networkMetric.utilization > 80) {
      bottlenecks.push({
        id: this.generateBottleneckId('network'),
        type: BottleneckType.NETWORK,
        severity: networkMetric.utilization > 90 ? BottleneckSeverity.MAJOR : BottleneckSeverity.MODERATE,
        description: `High network utilization: ${networkMetric.utilization.toFixed(1)}%`,
        affectedMetrics: [MetricType.RESOURCE_NETWORK.toString()],
        rootCause: 'High network traffic or bandwidth limitations',
        impact: {
          scope: ImpactScope.SYSTEM,
          severity: networkMetric.utilization / 100,
          affectedAgents: [],
          performanceDegradation: (networkMetric.utilization - 60) / 40,
          estimatedCost: 0
        },
        suggestions: [
          'Implement data compression',
          'Optimize communication protocols',
          'Use connection pooling',
          'Consider network topology optimization'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  /**
   * Detect storage bottlenecks
   */
  private detectStorageBottlenecks(storageMetric: any): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    if (storageMetric.utilization > 90) {
      bottlenecks.push({
        id: this.generateBottleneckId('storage'),
        type: BottleneckType.STORAGE,
        severity: storageMetric.utilization > 95 ? BottleneckSeverity.CRITICAL : BottleneckSeverity.MAJOR,
        description: `High storage utilization: ${storageMetric.utilization.toFixed(1)}%`,
        affectedMetrics: [MetricType.RESOURCE_STORAGE.toString()],
        rootCause: 'High storage I/O or insufficient storage capacity',
        impact: {
          scope: ImpactScope.SYSTEM,
          severity: storageMetric.utilization / 100,
          affectedAgents: [],
          performanceDegradation: (storageMetric.utilization - 80) / 20,
          estimatedCost: 0
        },
        suggestions: [
          'Implement caching strategies',
          'Optimize database queries',
          'Use asynchronous I/O',
          'Consider storage tiering'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  /**
   * Detect anti-patterns
   */
  private detectThunderingHerd(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Look for simultaneous operations that spike latency
    const bottlenecks: Bottleneck[] = [];
    
    const simultaneousOps = this.groupSimultaneousOperations(operations);
    
    for (const group of simultaneousOps) {
      if (group.length > 10) { // More than 10 simultaneous operations
        const avgLatency = group.reduce((sum, op) => sum + op.latency, 0) / group.length;
        const expectedLatency = group[0].latency; // Assume first operation represents normal latency
        
        if (avgLatency > expectedLatency * 3) { // 3x latency increase
          bottlenecks.push({
            id: this.generateBottleneckId('thundering_herd'),
            type: BottleneckType.CONCURRENCY,
            severity: BottleneckSeverity.MAJOR,
            description: `Thundering herd detected: ${group.length} simultaneous operations with ${avgLatency.toFixed(0)}ms average latency`,
            affectedMetrics: [MetricType.LATENCY.toString(), MetricType.CONCURRENT_OPERATIONS.toString()],
            rootCause: 'Simultaneous access to shared resources causing contention',
            impact: this.calculateThunderingHerdImpact(group),
            suggestions: [
              'Implement exponential backoff',
              'Use circuit breaker pattern',
              'Add jitter to operation timing',
              'Implement rate limiting'
            ],
            detectedAt: Date.now()
          });
        }
      }
    }

    return bottlenecks;
  }

  private detectHotSpots(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect when certain agents are overloaded
    const bottlenecks: Bottleneck[] = [];
    // Implementation would analyze agent-specific metrics
    return bottlenecks;
  }

  private detectResourceLeaks(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect gradually increasing resource usage over time
    const bottlenecks: Bottleneck[] = [];
    // Implementation would analyze resource trends
    return bottlenecks;
  }

  private detectDeadlocks(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect operations that never complete
    const bottlenecks: Bottleneck[] = [];
    
    const stalledOps = operations.filter(op => 
      !op.endTime && (Date.now() - op.startTime) > 300000 // 5 minutes
    );

    if (stalledOps.length > 0) {
      bottlenecks.push({
        id: this.generateBottleneckId('deadlock'),
        type: BottleneckType.CONCURRENCY,
        severity: BottleneckSeverity.CRITICAL,
        description: `Potential deadlock detected: ${stalledOps.length} operations stalled for >5 minutes`,
        affectedMetrics: [MetricType.SUCCESS_RATE.toString()],
        rootCause: 'Circular dependency or resource deadlock',
        impact: {
          scope: ImpactScope.SWARM,
          severity: 1.0,
          affectedAgents: [],
          performanceDegradation: 1.0,
          estimatedCost: stalledOps.length * 1000
        },
        suggestions: [
          'Implement timeout mechanisms',
          'Use deadlock detection algorithms',
          'Order resource acquisition consistently',
          'Implement deadlock recovery strategies'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  private detectLivelock(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect operations that keep retrying but never succeed
    const bottlenecks: Bottleneck[] = [];
    // Implementation would analyze retry patterns
    return bottlenecks;
  }

  private detectStarvation(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect operations that are consistently deprioritized
    const bottlenecks: Bottleneck[] = [];
    // Implementation would analyze operation priority and execution patterns
    return bottlenecks;
  }

  private detectCascadingFailures(operations: SwarmOperationMetrics[]): Bottleneck[] {
    // Detect failures that spread across the system
    const bottlenecks: Bottleneck[] = [];
    
    const failureSpread = this.analyzeFailureSpread(operations);
    if (failureSpread.cascading) {
      bottlenecks.push({
        id: this.generateBottleneckId('cascading_failure'),
        type: BottleneckType.EXTERNAL_DEPENDENCY,
        severity: BottleneckSeverity.CRITICAL,
        description: `Cascading failure detected: ${failureSpread.affectedOperations} operations affected`,
        affectedMetrics: [MetricType.SUCCESS_RATE.toString(), MetricType.ERROR_RATE.toString()],
        rootCause: 'Failure in critical component causing widespread impact',
        impact: {
          scope: ImpactScope.GLOBAL,
          severity: 0.9,
          affectedAgents: [],
          performanceDegradation: 0.8,
          estimatedCost: failureSpread.affectedOperations * 500
        },
        suggestions: [
          'Implement circuit breakers',
          'Add bulkhead isolation',
          'Implement graceful degradation',
          'Add health checks and automatic recovery'
        ],
        detectedAt: Date.now()
      });
    }

    return bottlenecks;
  }

  // Helper methods for calculations and analysis
  private generateBottleneckId(type: string): string {
    return `bottleneck_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateLatencySeverity(latency: number, threshold: number): BottleneckSeverity {
    const ratio = latency / threshold;
    if (ratio > 3) return BottleneckSeverity.CRITICAL;
    if (ratio > 2) return BottleneckSeverity.MAJOR;
    if (ratio > 1.5) return BottleneckSeverity.MODERATE;
    return BottleneckSeverity.MINOR;
  }

  private calculateLatencyImpact(metric: SwarmOperationMetrics): ImpactAnalysis {
    return {
      scope: ImpactScope.SWARM,
      severity: Math.min(metric.latency / 10000, 1.0), // Normalize to 10s max
      affectedAgents: [],
      performanceDegradation: Math.min(metric.latency / 5000, 1.0),
      estimatedCost: metric.latency * 0.1 // $0.1 per ms delay
    };
  }

  private analyzeLatencyRootCause(metric: SwarmOperationMetrics): string {
    if (metric.agentCount > 10) return 'High coordination overhead with many agents';
    if (metric.errors.length > 0) return 'Error handling and retries increasing latency';
    if (metric.operationType === SwarmOperationType.CONSENSUS) return 'Consensus algorithm latency';
    return 'Unknown latency source - requires detailed profiling';
  }

  private generateLatencySuggestions(metric: SwarmOperationMetrics): string[] {
    const suggestions = ['Add performance profiling to identify bottlenecks'];
    
    if (metric.agentCount > 10) {
      suggestions.push('Reduce coordination complexity');
      suggestions.push('Implement hierarchical coordination');
    }
    
    if (metric.errors.length > 0) {
      suggestions.push('Optimize error handling paths');
      suggestions.push('Implement fail-fast strategies');
    }
    
    return suggestions;
  }

  private calculateExpectedThroughput(metric: SwarmOperationMetrics): number {
    // Simplified calculation - in practice would use historical data and modeling
    const baseRate = 100; // ops per second per agent
    const parallelEfficiency = Math.min(1.0, 1.0 / Math.log(metric.agentCount + 1));
    return baseRate * metric.agentCount * parallelEfficiency;
  }

  private calculateThroughputSeverity(ratio: number): BottleneckSeverity {
    if (ratio < 0.25) return BottleneckSeverity.CRITICAL;
    if (ratio < 0.5) return BottleneckSeverity.MAJOR;
    if (ratio < 0.75) return BottleneckSeverity.MODERATE;
    return BottleneckSeverity.MINOR;
  }

  private calculateThroughputImpact(metric: SwarmOperationMetrics, expected: number): ImpactAnalysis {
    const deficit = expected - metric.throughput;
    return {
      scope: ImpactScope.SWARM,
      severity: deficit / expected,
      affectedAgents: [],
      performanceDegradation: deficit / expected,
      estimatedCost: deficit * 0.01 // $0.01 per lost op/s
    };
  }

  private analyzeThroughputRootCause(metric: SwarmOperationMetrics, expected: number): string {
    const ratio = metric.throughput / expected;
    if (ratio < 0.3) return 'Severe bottleneck - likely serialization point';
    if (ratio < 0.6) return 'Moderate bottleneck - coordination or resource contention';
    return 'Minor efficiency issues - optimization opportunities exist';
  }

  private generateThroughputSuggestions(metric: SwarmOperationMetrics): string[] {
    return [
      'Analyze task distribution and load balancing',
      'Identify and eliminate sequential bottlenecks',
      'Optimize agent coordination protocols',
      'Consider horizontal scaling if resources allow'
    ];
  }

  private calculateErrorRateSeverity(errorRate: number): BottleneckSeverity {
    if (errorRate > 0.2) return BottleneckSeverity.CRITICAL;
    if (errorRate > 0.1) return BottleneckSeverity.MAJOR;
    if (errorRate > 0.05) return BottleneckSeverity.MODERATE;
    return BottleneckSeverity.MINOR;
  }

  private calculateErrorRateImpact(metric: SwarmOperationMetrics, errorRate: number): ImpactAnalysis {
    return {
      scope: errorRate > 0.3 ? ImpactScope.GLOBAL : ImpactScope.SWARM,
      severity: errorRate,
      affectedAgents: [],
      performanceDegradation: errorRate * 0.8, // Errors significantly impact performance
      estimatedCost: errorRate * metric.taskCount * 10 // $10 per failed task
    };
  }

  private determineErrorBottleneckType(errors: any[]): BottleneckType {
    // Analyze error types to determine bottleneck category
    const networkErrors = errors.filter(e => e.errorType.includes('network')).length;
    const memoryErrors = errors.filter(e => e.errorType.includes('memory')).length;
    const timeoutErrors = errors.filter(e => e.errorType.includes('timeout')).length;

    if (networkErrors > errors.length * 0.5) return BottleneckType.NETWORK;
    if (memoryErrors > errors.length * 0.5) return BottleneckType.MEMORY;
    if (timeoutErrors > errors.length * 0.5) return BottleneckType.SERIALIZATION;

    return BottleneckType.EXTERNAL_DEPENDENCY;
  }

  private analyzeErrorRootCause(errors: any[]): string {
    if (errors.length === 0) return 'Unknown error source';
    
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {});

    const dominantError = Object.keys(errorTypes).reduce((a, b) => 
      errorTypes[a] > errorTypes[b] ? a : b
    );

    return `Dominant error type: ${dominantError} (${errorTypes[dominantError]} occurrences)`;
  }

  private generateErrorSuggestions(errors: any[]): string[] {
    const suggestions = ['Implement comprehensive error handling and recovery'];
    
    const hasTimeoutErrors = errors.some(e => e.errorType.includes('timeout'));
    const hasNetworkErrors = errors.some(e => e.errorType.includes('network'));
    const hasMemoryErrors = errors.some(e => e.errorType.includes('memory'));

    if (hasTimeoutErrors) {
      suggestions.push('Implement adaptive timeout strategies');
      suggestions.push('Add circuit breakers for failing operations');
    }

    if (hasNetworkErrors) {
      suggestions.push('Implement retry logic with exponential backoff');
      suggestions.push('Add network connection pooling');
    }

    if (hasMemoryErrors) {
      suggestions.push('Investigate memory leaks and optimize allocation');
      suggestions.push('Implement memory pressure monitoring');
    }

    return suggestions;
  }

  private calculateParallelEfficiency(metric: SwarmOperationMetrics): number {
    // Simplified calculation - ideal throughput vs actual
    const idealThroughput = metric.agentCount * (metric.throughput / metric.agentCount);
    return metric.throughput / idealThroughput;
  }

  private calculateConcurrencyImpact(metric: SwarmOperationMetrics, efficiency: number): ImpactAnalysis {
    const waste = 1 - efficiency;
    return {
      scope: ImpactScope.SWARM,
      severity: waste,
      affectedAgents: [],
      performanceDegradation: waste,
      estimatedCost: waste * metric.agentCount * 100 // $100 per wasted agent
    };
  }

  private calculateCoordinationOverhead(metric: SwarmOperationMetrics): number {
    // Estimate coordination overhead as percentage of total time
    const baseLatency = 100; // Base operation latency
    const coordinationLatency = metric.latency - baseLatency;
    return Math.max(0, coordinationLatency / metric.latency);
  }

  private calculateCoordinationImpact(metric: SwarmOperationMetrics, overhead: number): ImpactAnalysis {
    return {
      scope: ImpactScope.SWARM,
      severity: overhead,
      affectedAgents: [],
      performanceDegradation: overhead * 0.8,
      estimatedCost: overhead * metric.latency * 0.001 // Cost per ms of overhead
    };
  }

  private calculateScalingEfficiency(metric: SwarmOperationMetrics): number {
    // Measure how well throughput scales with agent count
    const expectedLinearThroughput = metric.agentCount * (metric.throughput / metric.agentCount);
    return metric.throughput / expectedLinearThroughput;
  }

  private calculateSerializationImpact(metric: SwarmOperationMetrics, efficiency: number): ImpactAnalysis {
    const waste = 1 - efficiency;
    return {
      scope: ImpactScope.SWARM,
      severity: waste,
      affectedAgents: [],
      performanceDegradation: waste * 0.9, // Serialization severely impacts performance
      estimatedCost: waste * metric.agentCount * 150 // Higher cost for serialization bottlenecks
    };
  }

  private groupSimultaneousOperations(operations: SwarmOperationMetrics[]): SwarmOperationMetrics[][] {
    const groups: SwarmOperationMetrics[][] = [];
    const timeWindow = 1000; // 1 second window

    const sortedOps = operations.sort((a, b) => a.startTime - b.startTime);
    
    let currentGroup: SwarmOperationMetrics[] = [];
    let groupStartTime = 0;

    for (const op of sortedOps) {
      if (currentGroup.length === 0 || op.startTime - groupStartTime <= timeWindow) {
        if (currentGroup.length === 0) {
          groupStartTime = op.startTime;
        }
        currentGroup.push(op);
      } else {
        if (currentGroup.length > 1) {
          groups.push(currentGroup);
        }
        currentGroup = [op];
        groupStartTime = op.startTime;
      }
    }

    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private calculateThunderingHerdImpact(operations: SwarmOperationMetrics[]): ImpactAnalysis {
    const avgLatency = operations.reduce((sum, op) => sum + op.latency, 0) / operations.length;
    const severity = Math.min(avgLatency / 5000, 1.0); // Normalize to 5s max

    return {
      scope: ImpactScope.SYSTEM,
      severity,
      affectedAgents: [],
      performanceDegradation: severity * 0.8,
      estimatedCost: operations.length * avgLatency * 0.01
    };
  }

  private analyzeFailureSpread(operations: SwarmOperationMetrics[]): {
    cascading: boolean;
    affectedOperations: number;
  } {
    const timeWindow = 60000; // 1 minute
    const failureThreshold = 0.3; // 30% failure rate indicates cascade

    const failedOps = operations.filter(op => op.successRate < 0.5);
    if (failedOps.length === 0) {
      return { cascading: false, affectedOperations: 0 };
    }

    // Group failures by time windows
    const windows = new Map<number, number>();
    
    for (const op of failedOps) {
      const windowStart = Math.floor(op.startTime / timeWindow) * timeWindow;
      windows.set(windowStart, (windows.get(windowStart) || 0) + 1);
    }

    // Check if failures are spreading over time
    const windowCounts = Array.from(windows.values());
    const increasing = windowCounts.length > 2 && 
      windowCounts[windowCounts.length - 1] > windowCounts[0] * 2;

    return {
      cascading: increasing && failedOps.length > operations.length * failureThreshold,
      affectedOperations: failedOps.length
    };
  }
}