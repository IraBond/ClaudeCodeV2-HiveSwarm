/**
 * Test suite for PerformanceAnalysisService
 */

const { createDevelopmentEngine } = require('../../src/performance/factory/PerformanceAnalysisFactory');
const { MetricType, SwarmOperationType, HealthStatus } = require('../../src/performance/types');

describe('PerformanceAnalysisService', () => {
  let engine;
  let service;
  let metricsCollector;

  beforeEach(() => {
    engine = createDevelopmentEngine();
    service = engine.service;
    metricsCollector = engine.metricsCollector;
  });

  afterEach(() => {
    if (engine) {
      service.cleanup();
      metricsCollector.cleanup();
    }
  });

  describe('Performance Analysis', () => {
    beforeEach(async () => {
      // Setup test data
      const metrics = [];
      const now = Date.now();

      // Create sample metrics
      for (let i = 0; i < 10; i++) {
        metrics.push(
          metricsCollector.createMetric(
            MetricType.LATENCY,
            100 + Math.random() * 200,
            'ms',
            `agent${i % 3}`,
            'swarm1',
            { iteration: i }
          )
        );
      }

      await metricsCollector.collect(metrics);

      // Create sample swarm operations
      for (let i = 0; i < 5; i++) {
        const swarmMetrics = metricsCollector.createSwarmOperationMetrics(
          'swarm1',
          SwarmOperationType.TASK_EXECUTION,
          now - (i * 10000), // Spread over time
          3 + i,
          50 + i * 10
        );

        swarmMetrics.endTime = swarmMetrics.startTime + 1000 + Math.random() * 2000;
        swarmMetrics.duration = swarmMetrics.endTime - swarmMetrics.startTime;
        swarmMetrics.latency = 150 + Math.random() * 100;
        swarmMetrics.throughput = 100 + Math.random() * 50;
        swarmMetrics.successRate = 0.9 + Math.random() * 0.1;

        // Add some resource usage
        swarmMetrics.resourceUsage.cpu.utilization = 40 + Math.random() * 30;
        swarmMetrics.resourceUsage.memory.utilization = 50 + Math.random() * 20;
        swarmMetrics.resourceUsage.network.utilization = 20 + Math.random() * 10;
        swarmMetrics.resourceUsage.storage.utilization = 30 + Math.random() * 15;

        await metricsCollector.collectSwarmMetrics(swarmMetrics);
      }
    });

    test('should perform comprehensive performance analysis', async () => {
      const result = await service.analyzePerformance();

      expect(result).toBeDefined();
      expect(result.analysisId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.timeRange).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.resourceAnalysis).toBeDefined();
    });

    test('should generate performance summary', async () => {
      const result = await service.analyzePerformance();
      const { summary } = result;

      expect(summary.totalOperations).toBeGreaterThan(0);
      expect(summary.successfulOperations).toBeGreaterThan(0);
      expect(summary.averageLatency).toBeGreaterThan(0);
      expect(summary.averageThroughput).toBeGreaterThan(0);
      expect(summary.resourceEfficiency).toBeGreaterThanOrEqual(0);
      expect(summary.resourceEfficiency).toBeLessThanOrEqual(1);
      expect(Object.values(HealthStatus)).toContain(summary.overallHealth);
    });

    test('should detect performance trends', async () => {
      const result = await service.analyzePerformance();
      const { trends } = result;

      expect(Array.isArray(trends)).toBe(true);
      
      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend.trend).toBeDefined();
        expect(trend.confidence).toBeGreaterThanOrEqual(0);
        expect(trend.confidence).toBeLessThanOrEqual(1);
        expect(trend.changeRate).toBeDefined();
      }
    });

    test('should identify bottlenecks', async () => {
      const result = await service.analyzePerformance();
      const { bottlenecks } = result;

      expect(Array.isArray(bottlenecks)).toBe(true);
      
      bottlenecks.forEach(bottleneck => {
        expect(bottleneck.id).toBeDefined();
        expect(bottleneck.type).toBeDefined();
        expect(bottleneck.severity).toBeDefined();
        expect(bottleneck.description).toBeDefined();
        expect(bottleneck.impact).toBeDefined();
        expect(Array.isArray(bottleneck.suggestions)).toBe(true);
      });
    });

    test('should generate recommendations', async () => {
      const result = await service.analyzePerformance();
      const { recommendations } = result;

      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec.id).toBeDefined();
        expect(rec.type).toBeDefined();
        expect(rec.priority).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.expectedImpact).toBeDefined();
        expect(rec.implementation).toBeDefined();
      });
    });

    test('should analyze resources', async () => {
      const result = await service.analyzePerformance();
      const { resourceAnalysis } = result;

      expect(resourceAnalysis.efficiency).toBeDefined();
      expect(resourceAnalysis.utilization).toBeDefined();
      expect(resourceAnalysis.waste).toBeDefined();
      expect(resourceAnalysis.optimization).toBeDefined();

      // Check efficiency metrics
      const { efficiency } = resourceAnalysis;
      expect(efficiency.overall).toBeGreaterThanOrEqual(0);
      expect(efficiency.cpu).toBeGreaterThanOrEqual(0);
      expect(efficiency.memory).toBeGreaterThanOrEqual(0);
      expect(efficiency.network).toBeGreaterThanOrEqual(0);
      expect(efficiency.storage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Swarm-specific Analysis', () => {
    beforeEach(async () => {
      const swarmMetrics = metricsCollector.createSwarmOperationMetrics(
        'test-swarm',
        SwarmOperationType.TASK_EXECUTION,
        Date.now() - 5000,
        5,
        100
      );

      swarmMetrics.endTime = Date.now();
      swarmMetrics.latency = 250;
      swarmMetrics.throughput = 120;
      swarmMetrics.successRate = 0.95;

      await metricsCollector.collectSwarmMetrics(swarmMetrics);
    });

    test('should analyze specific swarm performance', async () => {
      const result = await service.analyzeSwarmPerformance('test-swarm');

      expect(result).toBeDefined();
      expect(result.metadata.swarmId).toBe('test-swarm');
      expect(result.summary.totalOperations).toBe(1);
    });

    test('should handle non-existent swarm', async () => {
      await expect(
        service.analyzeSwarmPerformance('non-existent-swarm')
      ).rejects.toThrow('No metrics found for swarm: non-existent-swarm');
    });
  });

  describe('Real-time Status', () => {
    test('should get performance status', async () => {
      const status = await service.getPerformanceStatus();

      expect(status.health).toBeDefined();
      expect(Object.values(HealthStatus)).toContain(status.health);
      expect(status.activeBottlenecks).toBeGreaterThanOrEqual(0);
      expect(status.totalOperations).toBeGreaterThanOrEqual(0);
      expect(status.averageLatency).toBeGreaterThanOrEqual(0);
      expect(status.errorRate).toBeGreaterThanOrEqual(0);
      expect(status.resourceUtilization).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty metrics gracefully', async () => {
      // Create a fresh service with no data
      const freshEngine = createDevelopmentEngine();
      const freshService = freshEngine.service;

      const status = await freshService.getPerformanceStatus();

      expect(status.health).toBe(HealthStatus.GOOD);
      expect(status.totalOperations).toBe(0);
      expect(status.averageLatency).toBe(0);
      expect(status.errorRate).toBe(0);

      freshService.cleanup();
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      const metrics = [
        metricsCollector.createMetric(MetricType.LATENCY, 100, 'ms', 'agent1'),
        metricsCollector.createMetric(MetricType.THROUGHPUT, 150, 'ops/s', 'agent1')
      ];

      await metricsCollector.collect(metrics);
    });

    test('should export performance data as JSON', async () => {
      const jsonData = await service.exportPerformanceData({}, 'json');
      
      expect(typeof jsonData).toBe('string');
      
      const parsed = JSON.parse(jsonData);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    test('should export performance data as CSV', async () => {
      const csvData = await service.exportPerformanceData({}, 'csv');
      
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('id,timestamp,agentId');
      expect(csvData.split('\n').length).toBeGreaterThan(2); // Header + data rows
    });
  });

  describe('Metric Insights', () => {
    beforeEach(async () => {
      const metrics = [];
      
      // Create latency metrics with trend
      for (let i = 0; i < 20; i++) {
        metrics.push(
          metricsCollector.createMetric(
            MetricType.LATENCY,
            100 + i * 5, // Increasing trend
            'ms',
            'agent1',
            'swarm1',
            { sequence: i }
          )
        );
      }

      await metricsCollector.collect(metrics);
    });

    test('should get metric insights', async () => {
      const insights = await service.getMetricInsights(MetricType.LATENCY);

      expect(insights.summary).toBeDefined();
      expect(insights.trends).toBeDefined();
      expect(insights.anomalies).toBeDefined();
      expect(insights.correlations).toBeDefined();

      expect(Array.isArray(insights.trends)).toBe(true);
      expect(Array.isArray(insights.anomalies)).toBe(true);
      expect(Array.isArray(insights.correlations)).toBe(true);
    });

    test('should handle non-existent metric type', async () => {
      await expect(
        service.getMetricInsights('non-existent-metric')
      ).rejects.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should emit analysis events', (done) => {
      service.on('analysis:started', (event) => {
        expect(event.analysisId).toBeDefined();
        expect(event.timeRange).toBeDefined();
      });

      service.on('analysis:completed', (event) => {
        expect(event.analysisId).toBeDefined();
        expect(event.result).toBeDefined();
        done();
      });

      service.analyzePerformance().catch(() => {
        // Handle potential errors
        done();
      });
    });

    test('should handle errors gracefully', (done) => {
      service.on('analysis:error', (event) => {
        expect(event.error).toBeDefined();
        done();
      });

      // Force an error by corrupting internal state
      service.metricsCollector = null;
      service.analyzePerformance().catch(() => {
        // Expected to fail
      });
    });
  });
});