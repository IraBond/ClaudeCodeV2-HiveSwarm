/**
 * Comprehensive Test Suite for Marley Memory Bridge Integration
 * Tests performance reporting integration with Marley's memory synchronization
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import WebSocket from 'ws';
import { MarleyMemoryBridge } from '../src/performance-reporting/marley-memory-integration.js';
import { EnhancedPerformanceCollector } from '../src/performance-reporting/enhanced-collector.js';
import { MemoryPerformanceDashboard } from '../src/performance-reporting/memory-performance-dashboard.js';
import { Server } from 'http';

describe('Marley Memory Bridge Integration', () => {
  let mockWebSocketServer: WebSocket.Server;
  let server: Server;
  let marleyBridge: MarleyMemoryBridge;
  let collector: EnhancedPerformanceCollector;
  
  const TEST_PORT = 8081;
  const TEST_ENDPOINT = `ws://localhost:${TEST_PORT}/ws/memory-sync`;

  beforeAll(async () => {
    // Create mock Marley WebSocket server
    server = new Server();
    mockWebSocketServer = new WebSocket.Server({ 
      server,
      path: '/ws/memory-sync'
    });

    // Setup mock Marley responses
    mockWebSocketServer.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'sync_memory':
            // Simulate memory sync response
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'sync_result',
                data: {
                  synchronized_nodes: 25,
                  total_spectral_frequency: 12.5,
                  unique_resonance_threads: 18,
                  spectral_analysis_time: 150,
                  harmonization_time: 300,
                  resonance_extraction_time: 100,
                  airtable_latency: 250,
                  rate_limit_hits: 0,
                  error_rate: 0,
                  sync_success_rate: 1.0,
                  cache_hits: 80,
                  cache_misses: 20,
                  connection_density: 0.75,
                  structural_depth: 8,
                  harmonization_quality: 0.95,
                  alignment_efficiency: 0.88,
                  obsidian_compatibility: 0.98,
                  github_compatibility: 0.92,
                  hugo_compatibility: 0.85,
                  pandoc_compatibility: 0.90,
                  overall_compatibility: 0.91
                }
              }));
            }, 100);
            break;
            
          case 'harmonize_content':
            // Simulate harmonization response
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'harmonization_result',
                data: {
                  original_content: message.content,
                  harmonized_content: `# Harmonized Content\n\n${message.content}\n\n[[cross-reference]]`,
                  target_format: message.target_format || 'obsidian',
                  spectral_analysis: {
                    frequency: 2.5,
                    resonance_threads: 3,
                    connection_density: 0.8,
                    structural_depth: 2
                  },
                  harmonization_timestamp: new Date().toISOString()
                }
              }));
            }, 200);
            break;
            
          case 'spectral_analysis':
            // Simulate spectral analysis response
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'spectral_analysis',
                data: {
                  spectral_frequency: 3.2,
                  connection_density: 0.65,
                  analysis_duration: 180
                }
              }));
            }, 150);
            break;
        }
      });
    });

    // Start mock server
    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, resolve);
    });
  });

  afterAll(async () => {
    mockWebSocketServer.close();
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (marleyBridge) {
      await marleyBridge.disconnect();
    }
    if (collector) {
      await collector.stopCollection();
    }
  });

  describe('MarleyMemoryBridge', () => {
    it('should connect to Marley WebSocket server', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      await expect(marleyBridge.connect()).resolves.not.toThrow();
      expect(marleyBridge.isConnected()).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      marleyBridge = new MarleyMemoryBridge('ws://localhost:9999/invalid');
      
      await expect(marleyBridge.connect()).rejects.toThrow();
      expect(marleyBridge.isConnected()).toBe(false);
    });

    it('should collect memory sync metrics', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      let syncCompleteEvent: any = null;
      let metricsReceived: any = null;
      
      marleyBridge.on('sync_complete', (event) => {
        syncCompleteEvent = event;
      });
      
      marleyBridge.on('metrics', (metrics) => {
        metricsReceived = metrics;
      });
      
      await marleyBridge.connect();
      await marleyBridge.requestMemorySync();
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(syncCompleteEvent).toBeTruthy();
      expect(syncCompleteEvent.nodeCount).toBe(25);
      expect(metricsReceived).toBeTruthy();
      expect(metricsReceived.spectralAlignment.frequency).toBe(12.5);
    });

    it('should handle harmonization requests', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      let harmonizationEvent: any = null;
      
      marleyBridge.on('harmonization_complete', (event) => {
        harmonizationEvent = event;
      });
      
      await marleyBridge.connect();
      await marleyBridge.requestHarmonization('# Test Content\n\nThis is test content.', 'obsidian');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(harmonizationEvent).toBeTruthy();
      expect(harmonizationEvent.data.target_format).toBe('obsidian');
      expect(harmonizationEvent.data.harmonized_content).toContain('[[cross-reference]]');
    });

    it('should perform spectral analysis', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      await marleyBridge.connect();
      await marleyBridge.requestSpectralAnalysis('# Sample\n\nContent for analysis [[link]]');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should not throw and should be connected
      expect(marleyBridge.isConnected()).toBe(true);
    });

    it('should track connection health', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      await marleyBridge.connect();
      
      const health = marleyBridge.getConnectionHealth();
      expect(health.connected).toBe(true);
      expect(health.messagesSent).toBeGreaterThanOrEqual(0);
      expect(health.messagesReceived).toBeGreaterThanOrEqual(0);
    });

    it('should reconnect on connection loss', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      
      let connectionFailedEvent = false;
      marleyBridge.on('connection_failed', () => {
        connectionFailedEvent = true;
      });
      
      await marleyBridge.connect();
      expect(marleyBridge.isConnected()).toBe(true);
      
      // Force disconnect
      if (marleyBridge.ws) {
        marleyBridge.ws.close();
      }
      
      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should attempt reconnection
      expect(marleyBridge.reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('EnhancedPerformanceCollector', () => {
    it('should initialize with Marley integration', async () => {
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 1000,
        bufferSize: 100,
        enableRealTime: true,
        samplingStrategy: 'adaptive',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true,
        spectralAnalysisInterval: 5000,
        memoryHealthCheckInterval: 2000
      });

      await collector.startCollection();
      
      const status = collector.getMemoryBridgeStatus();
      expect(status.enabled).toBe(true);
    });

    it('should collect Marley-specific metrics', async () => {
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 500,
        bufferSize: 100,
        enableRealTime: true,
        samplingStrategy: 'uniform',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true
      });

      let metricsCollected: any[] = [];
      collector.on('metric_collected', (metric) => {
        metricsCollected.push(metric);
      });

      await collector.startCollection();
      await collector.requestMemorySync();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const memoryMetrics = collector.getMetricsBySource('MEMORY');
      const neuralMetrics = collector.getMetricsBySource('NEURAL');
      
      expect(memoryMetrics.length).toBeGreaterThan(0);
      expect(neuralMetrics.length).toBeGreaterThan(0);
      
      // Check for specific metric types
      const syncMetrics = memoryMetrics.filter(m => m.type === 'MEMORY_SYNC_DURATION');
      expect(syncMetrics.length).toBeGreaterThan(0);
    });

    it('should adapt collection frequency based on activity', async () => {
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 1000,
        bufferSize: 100,
        enableRealTime: true,
        samplingStrategy: 'adaptive',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true
      });

      await collector.startCollection();
      
      // Simulate high activity sync
      await collector.requestMemorySync();
      
      // Wait and check collection behavior
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const summary = collector.getPerformanceSummary();
      expect(summary.totalMetrics).toBeGreaterThan(0);
    });

    it('should generate comprehensive performance summary', async () => {
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 500,
        bufferSize: 100,
        enableRealTime: true,
        samplingStrategy: 'uniform',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true
      });

      await collector.startCollection();
      await collector.requestMemorySync();
      
      // Wait for metrics
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const summary = collector.getPerformanceSummary();
      
      expect(summary).toHaveProperty('totalMetrics');
      expect(summary).toHaveProperty('memoryMetrics');
      expect(summary).toHaveProperty('systemMetrics');
      expect(summary).toHaveProperty('neuralMetrics');
      expect(summary).toHaveProperty('marleyBridge');
      expect(summary).toHaveProperty('averages');
      
      expect(summary.totalMetrics).toBeGreaterThan(0);
      expect(summary.marleyBridge.enabled).toBe(true);
    });
  });

  describe('MemoryPerformanceDashboard', () => {
    let dashboard: MemoryPerformanceDashboard;
    const DASHBOARD_PORT = 3334;

    afterEach(async () => {
      if (dashboard) {
        await dashboard.stop();
      }
    });

    it('should start dashboard with Marley integration', async () => {
      dashboard = new MemoryPerformanceDashboard({
        port: DASHBOARD_PORT,
        enableWebSocket: true,
        updateInterval: 1000,
        marleyEndpoint: TEST_ENDPOINT,
        enableCORS: true
      });

      await expect(dashboard.start()).resolves.not.toThrow();
    }, 10000);

    it('should serve dashboard HTML', async () => {
      dashboard = new MemoryPerformanceDashboard({
        port: DASHBOARD_PORT,
        enableWebSocket: false,
        updateInterval: 1000,
        marleyEndpoint: TEST_ENDPOINT
      });

      await dashboard.start();
      
      // Test HTTP endpoint
      const response = await fetch(`http://localhost:${DASHBOARD_PORT}/health`);
      const health = await response.json();
      
      expect(health.status).toBe('healthy');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
    });

    it('should provide API endpoints for metrics', async () => {
      dashboard = new MemoryPerformanceDashboard({
        port: DASHBOARD_PORT,
        enableWebSocket: false,
        updateInterval: 1000,
        marleyEndpoint: TEST_ENDPOINT
      });

      await dashboard.start();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test metrics endpoint
      const metricsResponse = await fetch(`http://localhost:${DASHBOARD_PORT}/api/metrics/current`);
      expect(metricsResponse.ok).toBe(true);
      
      // Test memory status endpoint
      const statusResponse = await fetch(`http://localhost:${DASHBOARD_PORT}/api/memory/status`);
      expect(statusResponse.ok).toBe(true);
      
      const status = await statusResponse.json();
      expect(status).toHaveProperty('enabled');
    });

    it('should handle memory sync requests via API', async () => {
      dashboard = new MemoryPerformanceDashboard({
        port: DASHBOARD_PORT,
        enableWebSocket: false,
        updateInterval: 1000,
        marleyEndpoint: TEST_ENDPOINT
      });

      await dashboard.start();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test sync endpoint
      const syncResponse = await fetch(`http://localhost:${DASHBOARD_PORT}/api/memory/sync`, {
        method: 'POST'
      });
      
      expect(syncResponse.ok).toBe(true);
      
      const result = await syncResponse.json();
      expect(result).toHaveProperty('success');
    });

    it('should generate performance reports via API', async () => {
      dashboard = new MemoryPerformanceDashboard({
        port: DASHBOARD_PORT,
        enableWebSocket: false,
        updateInterval: 1000,
        marleyEndpoint: TEST_ENDPOINT
      });

      await dashboard.start();
      
      // Wait for initialization and collect some metrics
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test report generation
      const reportResponse = await fetch(
        `http://localhost:${DASHBOARD_PORT}/api/reports/performance?format=json&includeMemory=true`
      );
      
      expect(reportResponse.ok).toBe(true);
      
      const report = await reportResponse.json();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full memory sync workflow', async () => {
      marleyBridge = new MarleyMemoryBridge(TEST_ENDPOINT);
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 500,
        bufferSize: 100,
        enableRealTime: true,
        samplingStrategy: 'uniform',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true
      });

      // Start collector and connect bridge
      await collector.startCollection();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Request sync and harmonization
      await collector.requestMemorySync();
      await collector.requestHarmonization('# Test Document\n\nSample content [[link]]', 'github');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify metrics collection
      const summary = collector.getPerformanceSummary();
      const memoryStatus = collector.getMemoryBridgeStatus();
      
      expect(summary.totalMetrics).toBeGreaterThan(0);
      expect(summary.memoryMetrics).toBeGreaterThan(0);
      expect(memoryStatus.connected).toBe(true);
      
      // Check for specific memory metrics
      const memoryMetrics = collector.getMetricsBySource('MEMORY');
      const syncMetrics = memoryMetrics.filter(m => m.type === 'MEMORY_SYNC_DURATION');
      
      expect(syncMetrics.length).toBeGreaterThan(0);
      expect(syncMetrics[0].metadata).toHaveProperty('syncResult');
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid endpoint
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 1000,
        bufferSize: 100,
        enableRealTime: false,
        samplingStrategy: 'uniform',
        marleyEndpoint: 'ws://localhost:9999/invalid',
        enableMemoryMetrics: true
      });

      await collector.startCollection();
      
      // Wait for connection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const memoryStatus = collector.getMemoryBridgeStatus();
      expect(memoryStatus.connected).toBe(false);
      expect(memoryStatus.enabled).toBe(true);
      
      // Should still collect system metrics
      const summary = collector.getPerformanceSummary();
      expect(summary.systemMetrics).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      collector = new EnhancedPerformanceCollector({
        collectionInterval: 100, // High frequency
        bufferSize: 1000,
        enableRealTime: true,
        samplingStrategy: 'adaptive',
        marleyEndpoint: TEST_ENDPOINT,
        enableMemoryMetrics: true
      });

      const startTime = Date.now();
      await collector.startCollection();
      
      // Generate load
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(collector.requestMemorySync());
        promises.push(collector.requestHarmonization(`# Document ${i}\n\nContent ${i}`, 'obsidian'));
      }
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const endTime = Date.now();
      const summary = collector.getPerformanceSummary();
      
      expect(summary.totalMetrics).toBeGreaterThan(50);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in under 10 seconds
      
      // Check memory usage is reasonable
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });
  });
});

// Utility function for fetch in Node.js environment
async function fetch(url: string, options?: any): Promise<any> {
  const http = await import('http');
  const https = await import('https');
  const { URL } = await import('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const request = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options?.method || 'GET',
      headers: options?.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode,
          json: () => JSON.parse(data),
          text: () => data
        });
      });
    });
    
    if (options?.body) {
      request.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    request.on('error', reject);
    request.end();
  });
}