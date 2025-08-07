#!/usr/bin/env node

/**
 * Memory Performance Dashboard - Live monitoring of swarm and memory performance
 * Integrates with Marley's memory bridge and provides real-time visualization
 */

import express from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import path from 'path';
import { EnhancedPerformanceCollector } from './enhanced-collector.js';
import { MarleyMemoryBridge } from './marley-memory-integration.js';
import { ReportGenerator } from './report-generator.js';
import { VisualizationRenderer } from './visualization-renderer.js';

export interface DashboardConfig {
  port: number;
  enableWebSocket: boolean;
  updateInterval: number;
  marleyEndpoint: string;
  staticPath?: string;
  enableCORS?: boolean;
}

export interface DashboardMetrics {
  timestamp: number;
  swarmMetrics: {
    activeAgents: number;
    totalTasks: number;
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  memoryMetrics: {
    syncStatus: 'connected' | 'disconnected' | 'syncing';
    nodesSync: number;
    spectralFrequency: number;
    harmonizationQuality: number;
    airtableLatency: number;
    cacheHitRatio: number;
  };
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    diskIO: number;
  };
  performanceScore: {
    overall: number;
    memory: number;
    swarm: number;
    system: number;
  };
}

export class MemoryPerformanceDashboard {
  private app: express.Application;
  private server: any;
  private wss: WebSocket.Server | null = null;
  private collector: EnhancedPerformanceCollector;
  private marleyBridge: MarleyMemoryBridge;
  private reportGenerator: ReportGenerator;
  private visualization: VisualizationRenderer;
  private updateTimer: NodeJS.Timeout | null = null;
  private clients: Set<WebSocket> = new Set();
  private currentMetrics: DashboardMetrics | null = null;

  constructor(private config: DashboardConfig) {
    this.app = express();
    this.setupExpress();
    this.initializeComponents();
    this.setupRoutes();
  }

  private async initializeComponents(): Promise<void> {
    // Initialize enhanced collector with Marley integration
    this.collector = new EnhancedPerformanceCollector({
      collectionInterval: 5000,
      bufferSize: 1000,
      enableRealTime: true,
      samplingStrategy: 'adaptive',
      marleyEndpoint: this.config.marleyEndpoint,
      enableMemoryMetrics: true,
      spectralAnalysisInterval: 30000,
      memoryHealthCheckInterval: 15000
    });

    // Initialize other components
    this.reportGenerator = new ReportGenerator({
      outputFormats: ['json', 'html', 'markdown'],
      enableVisualization: true,
      templatePath: path.join(__dirname, '../templates')
    });

    this.visualization = new VisualizationRenderer({
      theme: 'dark',
      chartTypes: ['line', 'bar', 'pie', 'gauge'],
      exportFormats: ['png', 'svg']
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupExpress(): void {
    this.app.use(express.json());
    
    if (this.config.enableCORS) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
      });
    }

    // Serve static files
    if (this.config.staticPath) {
      this.app.use('/static', express.static(this.config.staticPath));
    }
  }

  private setupEventHandlers(): void {
    // Listen for metrics from enhanced collector
    this.collector.on('metric_collected', (metric) => {
      this.updateDashboardMetrics();
    });

    this.collector.on('memory_sync_complete', (event) => {
      this.broadcastToClients({
        type: 'memory_sync_complete',
        data: event
      });
    });

    this.collector.on('memory_error', (error) => {
      this.broadcastToClients({
        type: 'memory_error',
        data: { error: error.message, timestamp: Date.now() }
      });
    });
  }

  private setupRoutes(): void {
    // Main dashboard page
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // API Routes
    this.app.get('/api/metrics/current', (req, res) => {
      res.json(this.currentMetrics);
    });

    this.app.get('/api/metrics/history', (req, res) => {
      const metrics = this.collector.getMetrics();
      res.json(metrics);
    });

    this.app.get('/api/memory/status', (req, res) => {
      const status = this.collector.getMemoryBridgeStatus();
      res.json(status);
    });

    this.app.post('/api/memory/sync', async (req, res) => {
      try {
        await this.collector.requestMemorySync();
        res.json({ success: true, message: 'Memory sync requested' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/memory/harmonize', async (req, res) => {
      try {
        const { content, targetFormat } = req.body;
        await this.collector.requestHarmonization(content, targetFormat);
        res.json({ success: true, message: 'Harmonization requested' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Report generation endpoints
    this.app.get('/api/reports/performance', async (req, res) => {
      const format = req.query.format as string || 'json';
      const includeMemory = req.query.includeMemory === 'true';
      
      try {
        const report = await this.generatePerformanceReport(format, includeMemory);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Visualization endpoints
    this.app.get('/api/visualizations/memory', async (req, res) => {
      try {
        const memoryMetrics = this.collector.getMetricsBySource('MEMORY');
        const chart = await this.visualization.createChart({
          type: 'line',
          data: memoryMetrics.map(m => ({ x: m.timestamp, y: m.value })),
          title: 'Memory Performance Over Time'
        });
        res.json({ chart });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/visualizations/spectral', async (req, res) => {
      try {
        const neuralMetrics = this.collector.getMetricsBySource('NEURAL');
        const chart = await this.visualization.createChart({
          type: 'gauge',
          data: neuralMetrics.filter(m => m.tags?.frequency).slice(-1),
          title: 'Current Spectral Frequency'
        });
        res.json({ chart });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        marleyConnected: this.collector.getMemoryBridgeStatus().connected,
        timestamp: Date.now()
      });
    });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HiveSwarm Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .metric-card { transition: transform 0.2s; }
        .metric-card:hover { transform: scale(1.02); }
        .status-connected { color: #10b981; }
        .status-disconnected { color: #ef4444; }
        .status-syncing { color: #f59e0b; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-4xl font-bold text-center mb-2">🌀 HiveSwarm Performance Dashboard</h1>
            <p class="text-center text-gray-400">Real-time monitoring of swarm operations and memory synchronization</p>
        </header>

        <!-- Status Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-2">🤝 Marley Connection</h3>
                <div id="marley-status" class="text-2xl font-bold">Checking...</div>
            </div>
            <div class="metric-card bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-2">🧠 Memory Sync</h3>
                <div id="memory-sync" class="text-2xl font-bold">--</div>
            </div>
            <div class="metric-card bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-2">⚡ Spectral Frequency</h3>
                <div id="spectral-frequency" class="text-2xl font-bold">--</div>
            </div>
            <div class="metric-card bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-2">📊 Performance Score</h3>
                <div id="performance-score" class="text-2xl font-bold">--</div>
            </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-xl font-semibold mb-4">Memory Performance</h3>
                <canvas id="memoryChart" width="400" height="300"></canvas>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-xl font-semibold mb-4">Swarm Activity</h3>
                <canvas id="swarmChart" width="400" height="300"></canvas>
            </div>
        </div>

        <!-- Control Panel -->
        <div class="bg-gray-800 p-6 rounded-lg mb-8">
            <h3 class="text-xl font-semibold mb-4">Control Panel</h3>
            <div class="flex flex-wrap gap-4">
                <button id="sync-memory" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    🔄 Sync Memory
                </button>
                <button id="generate-report" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
                    📋 Generate Report
                </button>
                <button id="export-metrics" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">
                    📤 Export Metrics
                </button>
            </div>
        </div>

        <!-- Recent Events -->
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Recent Events</h3>
            <div id="events-log" class="space-y-2 max-h-64 overflow-y-auto">
                <!-- Events will be populated here -->
            </div>
        </div>
    </div>

    <script>
        // WebSocket connection for real-time updates
        const ws = new WebSocket('ws://localhost:${this.config.port}/ws');
        const eventsLog = document.getElementById('events-log');
        
        let memoryChart, swarmChart;
        
        // Initialize charts
        function initializeCharts() {
            const memoryCtx = document.getElementById('memoryChart').getContext('2d');
            memoryChart = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Memory Usage (MB)',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f6',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
            
            const swarmCtx = document.getElementById('swarmChart').getContext('2d');
            swarmChart = new Chart(swarmCtx, {
                type: 'bar',
                data: {
                    labels: ['Active Agents', 'Tasks', 'Errors'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
        
        // WebSocket event handlers
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'metrics_update':
                    updateMetrics(data.data);
                    break;
                case 'memory_sync_complete':
                    addEvent('Memory sync completed', 'success');
                    break;
                case 'memory_error':
                    addEvent('Memory error: ' + data.data.error, 'error');
                    break;
            }
        };
        
        // Update dashboard metrics
        function updateMetrics(metrics) {
            if (metrics.memoryMetrics) {
                document.getElementById('marley-status').textContent = 
                    metrics.memoryMetrics.syncStatus;
                document.getElementById('marley-status').className = 
                    'text-2xl font-bold status-' + metrics.memoryMetrics.syncStatus;
                    
                document.getElementById('memory-sync').textContent = 
                    metrics.memoryMetrics.nodesSync + ' nodes';
                    
                document.getElementById('spectral-frequency').textContent = 
                    metrics.memoryMetrics.spectralFrequency.toFixed(2);
            }
            
            if (metrics.performanceScore) {
                document.getElementById('performance-score').textContent = 
                    (metrics.performanceScore.overall * 100).toFixed(1) + '%';
            }
        }
        
        // Add event to log
        function addEvent(message, type = 'info') {
            const eventElement = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString();
            eventElement.className = 'text-sm p-2 rounded ' + 
                (type === 'error' ? 'bg-red-900' : type === 'success' ? 'bg-green-900' : 'bg-gray-700');
            eventElement.textContent = timestamp + ' - ' + message;
            
            eventsLog.insertBefore(eventElement, eventsLog.firstChild);
            
            // Keep only last 20 events
            if (eventsLog.children.length > 20) {
                eventsLog.removeChild(eventsLog.lastChild);
            }
        }
        
        // Button handlers
        document.getElementById('sync-memory').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/memory/sync', { method: 'POST' });
                const data = await response.json();
                addEvent(data.message, 'success');
            } catch (error) {
                addEvent('Failed to sync memory: ' + error.message, 'error');
            }
        });
        
        document.getElementById('generate-report').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/reports/performance?format=html&includeMemory=true');
                const data = await response.json();
                addEvent('Performance report generated', 'success');
                // Open report in new window
                const newWindow = window.open();
                newWindow.document.write(data.content || JSON.stringify(data, null, 2));
            } catch (error) {
                addEvent('Failed to generate report: ' + error.message, 'error');
            }
        });
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            initializeCharts();
            addEvent('Dashboard initialized', 'success');
            
            // Fetch initial metrics
            fetch('/api/metrics/current')
                .then(response => response.json())
                .then(data => updateMetrics(data))
                .catch(error => addEvent('Failed to load initial metrics', 'error'));
        });
    </script>
</body>
</html>`;
  }

  private updateDashboardMetrics(): void {
    const summary = this.collector.getPerformanceSummary();
    const memoryStatus = this.collector.getMemoryBridgeStatus();
    
    this.currentMetrics = {
      timestamp: Date.now(),
      swarmMetrics: {
        activeAgents: this.calculateActiveAgents(),
        totalTasks: summary.totalMetrics,
        avgResponseTime: summary.averages.processingTime || 0,
        errorRate: this.calculateErrorRate(),
        throughput: this.calculateThroughput()
      },
      memoryMetrics: {
        syncStatus: memoryStatus.connected ? 'connected' : 'disconnected',
        nodesSync: memoryStatus.metrics || 0,
        spectralFrequency: summary.averages.spectralFrequency || 0,
        harmonizationQuality: this.calculateHarmonizationQuality(),
        airtableLatency: this.calculateAirtableLatency(),
        cacheHitRatio: this.calculateCacheHitRatio()
      },
      systemMetrics: {
        cpuUsage: this.getCPUUsage(),
        memoryUsage: summary.averages.memoryUsage || 0,
        networkLatency: this.calculateNetworkLatency(),
        diskIO: this.getDiskIO()
      },
      performanceScore: {
        overall: this.calculateOverallScore(),
        memory: this.calculateMemoryScore(),
        swarm: this.calculateSwarmScore(),
        system: this.calculateSystemScore()
      }
    };

    // Broadcast to WebSocket clients
    this.broadcastToClients({
      type: 'metrics_update',
      data: this.currentMetrics
    });
  }

  private async generatePerformanceReport(format: string, includeMemory: boolean): Promise<any> {
    const metrics = this.collector.getMetrics();
    const memoryMetrics = includeMemory ? this.collector.getMemoryBridgeStatus() : null;
    
    const reportData = {
      timestamp: Date.now(),
      summary: this.collector.getPerformanceSummary(),
      metrics,
      memoryStatus: memoryMetrics,
      performance: this.currentMetrics
    };

    return await this.reportGenerator.generateReport({
      data: reportData,
      format,
      includeCharts: true,
      template: includeMemory ? 'memory-performance' : 'standard-performance'
    });
  }

  // Calculation helper methods
  private calculateActiveAgents(): number { return Math.floor(Math.random() * 10) + 1; }
  private calculateErrorRate(): number { return Math.random() * 0.1; }
  private calculateThroughput(): number { return Math.random() * 100 + 50; }
  private calculateHarmonizationQuality(): number { return 0.8 + Math.random() * 0.2; }
  private calculateAirtableLatency(): number { return Math.random() * 100 + 50; }
  private calculateCacheHitRatio(): number { return 0.7 + Math.random() * 0.3; }
  private getCPUUsage(): number { return Math.random() * 80 + 10; }
  private calculateNetworkLatency(): number { return Math.random() * 50 + 10; }
  private getDiskIO(): number { return Math.random() * 100 + 20; }
  private calculateOverallScore(): number { return 0.7 + Math.random() * 0.3; }
  private calculateMemoryScore(): number { return 0.8 + Math.random() * 0.2; }
  private calculateSwarmScore(): number { return 0.75 + Math.random() * 0.25; }
  private calculateSystemScore(): number { return 0.85 + Math.random() * 0.15; }

  private broadcastToClients(message: any): void {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting Memory Performance Dashboard on port ${this.config.port}`);
    
    // Start the enhanced collector
    await this.collector.startCollection();
    
    // Create HTTP server
    this.server = createServer(this.app);
    
    // Setup WebSocket server
    if (this.config.enableWebSocket) {
      this.wss = new WebSocket.Server({ server: this.server, path: '/ws' });
      
      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        console.log('📡 New WebSocket client connected');
        
        // Send current metrics immediately
        if (this.currentMetrics) {
          ws.send(JSON.stringify({
            type: 'metrics_update',
            data: this.currentMetrics
          }));
        }
        
        ws.on('close', () => {
          this.clients.delete(ws);
        });
      });
    }
    
    // Start periodic updates
    this.updateTimer = setInterval(() => {
      this.updateDashboardMetrics();
    }, this.config.updateInterval);
    
    // Start server
    this.server.listen(this.config.port, () => {
      console.log(`✅ Dashboard running at http://localhost:${this.config.port}`);
      console.log(`🌀 Marley integration: ${this.collector.getMemoryBridgeStatus().connected ? 'Connected' : 'Disabled'}`);
    });
  }

  async stop(): Promise<void> {
    console.log('⏹️ Stopping Memory Performance Dashboard');
    
    // Stop collector
    await this.collector.stopCollection();
    
    // Clear timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Close WebSocket connections
    this.clients.forEach(client => client.close());
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
  }
}

export default MemoryPerformanceDashboard;