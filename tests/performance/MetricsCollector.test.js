/**
 * Test suite for MetricsCollector
 */

const { MetricsCollector } = require('../../src/performance/core/MetricsCollector');
const { MetricType, SwarmOperationType } = require('../../src/performance/types');

describe('MetricsCollector', () => {
  let collector;
  let config;

  beforeEach(() => {
    config = {
      sampling: {
        interval: 1000,
        batchSize: 10,
        retentionPeriod: 1,
        compressionEnabled: false
      },
      storage: {
        type: 'memory',
        config: {}
      }
    };
    
    collector = new MetricsCollector(config.sampling, config.storage);
  });

  afterEach(() => {
    if (collector) {
      collector.cleanup();
    }
  });

  describe('Metric Collection', () => {
    test('should collect performance metrics', async () => {
      const metrics = [
        collector.createMetric(MetricType.LATENCY, 150, 'ms', 'agent1', 'swarm1'),
        collector.createMetric(MetricType.THROUGHPUT, 1000, 'ops/s', 'agent2', 'swarm1')
      ];

      await collector.collect(metrics);

      const retrieved = await collector.getMetrics({
        swarmIds: ['swarm1']
      });

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].metricType).toBe(MetricType.LATENCY);
      expect(retrieved[1].metricType).toBe(MetricType.THROUGHPUT);
    });

    test('should create swarm operation metrics', async () => {
      const swarmMetrics = collector.createSwarmOperationMetrics(
        'swarm1',
        SwarmOperationType.TASK_EXECUTION,
        Date.now(),
        5,
        100
      );

      await collector.collectSwarmMetrics(swarmMetrics);

      const retrieved = await collector.getSwarmMetrics('swarm1');
      
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].swarmId).toBe('swarm1');
      expect(retrieved[0].operationType).toBe(SwarmOperationType.TASK_EXECUTION);
      expect(retrieved[0].agentCount).toBe(5);
      expect(retrieved[0].taskCount).toBe(100);
    });

    test('should update swarm operation metrics', async () => {
      const swarmMetrics = collector.createSwarmOperationMetrics(
        'swarm1',
        SwarmOperationType.TASK_EXECUTION,
        Date.now(),
        5,
        100
      );

      await collector.collectSwarmMetrics(swarmMetrics);

      const endTime = Date.now() + 5000;
      collector.updateSwarmMetrics(swarmMetrics.operationId, {
        endTime,
        successRate: 0.95,
        throughput: 150,
        latency: 200
      });

      const retrieved = await collector.getSwarmMetrics('swarm1');
      const updated = retrieved[0];

      expect(updated.endTime).toBe(endTime);
      expect(updated.duration).toBe(endTime - updated.startTime);
      expect(updated.successRate).toBe(0.95);
      expect(updated.throughput).toBe(150);
      expect(updated.latency).toBe(200);
    });

    test('should record operation errors', () => {
      const swarmMetrics = collector.createSwarmOperationMetrics(
        'swarm1',
        SwarmOperationType.TASK_EXECUTION,
        Date.now(),
        5,
        100
      );

      collector.collectSwarmMetrics(swarmMetrics);
      
      collector.recordError(swarmMetrics.operationId, {
        agentId: 'agent1',
        errorType: 'network_timeout',
        message: 'Connection timed out',
        severity: 'medium',
        context: { timeout: 5000 }
      });

      const retrieved = collector.getSwarmMetrics('swarm1');
      const withErrors = retrieved[0];

      expect(withErrors.errors).toHaveLength(1);
      expect(withErrors.errors[0].errorType).toBe('network_timeout');
      expect(withErrors.errors[0].message).toBe('Connection timed out');
      expect(withErrors.errors[0].severity).toBe('medium');
    });
  });

  describe('Metric Querying', () => {
    beforeEach(async () => {
      const metrics = [
        collector.createMetric(MetricType.LATENCY, 100, 'ms', 'agent1', 'swarm1'),
        collector.createMetric(MetricType.LATENCY, 200, 'ms', 'agent2', 'swarm1'),
        collector.createMetric(MetricType.THROUGHPUT, 500, 'ops/s', 'agent1', 'swarm2'),
        collector.createMetric(MetricType.ERROR_RATE, 0.05, 'ratio', 'agent3', 'swarm1')
      ];

      await collector.collect(metrics);
    });

    test('should filter metrics by swarm ID', async () => {
      const results = await collector.getMetrics({
        swarmIds: ['swarm1']
      });

      expect(results).toHaveLength(3);
      expect(results.every(m => m.swarmId === 'swarm1')).toBe(true);
    });

    test('should filter metrics by agent ID', async () => {
      const results = await collector.getMetrics({
        agentIds: ['agent1']
      });

      expect(results).toHaveLength(2);
      expect(results.every(m => m.agentId === 'agent1')).toBe(true);
    });

    test('should filter metrics by type', async () => {
      const results = await collector.getMetrics({
        metricTypes: [MetricType.LATENCY]
      });

      expect(results).toHaveLength(2);
      expect(results.every(m => m.metricType === MetricType.LATENCY)).toBe(true);
    });

    test('should filter metrics by time range', async () => {
      const now = Date.now();
      const timeRange = {
        start: now - 1000,
        end: now + 1000,
        duration: 2000
      };

      const results = await collector.getMetrics({ timeRange });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )).toBe(true);
    });
  });

  describe('Statistics and Cleanup', () => {
    test('should provide metric statistics', async () => {
      const metrics = [
        collector.createMetric(MetricType.LATENCY, 100, 'ms'),
        collector.createMetric(MetricType.THROUGHPUT, 500, 'ops/s')
      ];

      await collector.collect(metrics);

      const swarmMetrics = collector.createSwarmOperationMetrics(
        'swarm1',
        SwarmOperationType.TASK_EXECUTION,
        Date.now(),
        3,
        50
      );

      await collector.collectSwarmMetrics(swarmMetrics);

      const stats = collector.getMetricStats();

      expect(stats.totalMetrics).toBe(2);
      expect(stats.totalSwarmMetrics).toBe(1);
      expect(stats.swarmCount).toBe(1);
      expect(stats.newestMetric).toBeDefined();
      expect(stats.oldestMetric).toBeDefined();
    });

    test('should get all swarm IDs', async () => {
      const swarmMetrics1 = collector.createSwarmOperationMetrics(
        'swarm1', SwarmOperationType.TASK_EXECUTION, Date.now(), 3, 50
      );
      const swarmMetrics2 = collector.createSwarmOperationMetrics(
        'swarm2', SwarmOperationType.COORDINATION, Date.now(), 5, 75
      );

      await collector.collectSwarmMetrics(swarmMetrics1);
      await collector.collectSwarmMetrics(swarmMetrics2);

      const swarmIds = collector.getSwarmIds();

      expect(swarmIds).toHaveLength(2);
      expect(swarmIds).toContain('swarm1');
      expect(swarmIds).toContain('swarm2');
    });

    test('should cleanup resources', () => {
      collector.cleanup();
      
      const stats = collector.getMetricStats();
      expect(stats.totalMetrics).toBe(0);
      expect(stats.totalSwarmMetrics).toBe(0);
      expect(stats.swarmCount).toBe(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit collection events', (done) => {
      collector.on('metrics:collected', (event) => {
        expect(event.count).toBe(1);
        expect(event.timestamp).toBeDefined();
        done();
      });

      const metric = collector.createMetric(MetricType.LATENCY, 100, 'ms');
      collector.collect([metric]);
    });

    test('should emit swarm metrics events', (done) => {
      collector.on('swarm:metrics:collected', (event) => {
        expect(event.swarmId).toBe('swarm1');
        expect(event.operationType).toBe(SwarmOperationType.TASK_EXECUTION);
        done();
      });

      const swarmMetrics = collector.createSwarmOperationMetrics(
        'swarm1',
        SwarmOperationType.TASK_EXECUTION,
        Date.now(),
        3,
        50
      );

      collector.collectSwarmMetrics(swarmMetrics);
    });

    test('should emit error events', (done) => {
      collector.on('error', (event) => {
        expect(event.type).toBe('collection');
        expect(event.error).toBeDefined();
        done();
      });

      // Trigger an error by passing invalid data
      collector.collect(null).catch(() => {
        // Expected to fail
      });
    });
  });
});