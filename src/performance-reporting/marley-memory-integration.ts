#!/usr/bin/env node

/**
 * ClaudeCode HiveSwarm - Marley Memory Bridge Performance Integration
 * Connects performance reporting with Marley's memory synchronization system
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { 
  PerformanceMetric, 
  MetricType, 
  MetricSource,
  PerformanceCollector,
  MemoryMetrics,
  SpectralMetrics 
} from './interfaces.js';

export interface MarleyMemoryMetrics extends MemoryMetrics {
  spectralAlignment: SpectralMetrics;
  memoryNodeProcessing: {
    nodesPerSecond: number;
    averageProcessingTime: number;
    spectralAnalysisTime: number;
    harmonizationTime: number;
    resonanceExtractionTime: number;
  };
  airtablePerformance: {
    apiLatency: number;
    rateLimitHits: number;
    errorRate: number;
    syncSuccessRate: number;
  };
  crossPlatformCompatibility: {
    obsidianCompatibility: number;
    githubCompatibility: number;
    hugoCompatibility: number;
    pandocCompatibility: number;
    overallCompatibilityScore: number;
  };
}

export interface SpectralMetrics {
  frequency: number;
  resonanceThreads: number;
  connectionDensity: number;
  structuralDepth: number;
  harmonizationQuality: number;
  alignmentEfficiency: number;
}

export interface MemorySyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'harmonization_complete';
  timestamp: number;
  data: any;
  duration?: number;
  nodeCount?: number;
  spectralData?: SpectralMetrics;
}

export class MarleyMemoryBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private collector: PerformanceCollector;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private metricsBuffer: MarleyMemoryMetrics[] = [];
  private connectionHealth = {
    connected: false,
    lastHeartbeat: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errorsCount: 0
  };

  constructor(
    private memoryEndpoint: string = 'ws://localhost:8080/ws/memory-sync',
    collector?: PerformanceCollector
  ) {
    super();
    this.collector = collector || new PerformanceCollector();
    this.setupHeartbeat();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🧠 Connecting to Marley Memory Bridge: ${this.memoryEndpoint}`);
        
        this.ws = new WebSocket(this.memoryEndpoint);
        
        this.ws.on('open', () => {
          console.log('✅ Connected to Marley Memory Bridge');
          this.connectionHealth.connected = true;
          this.connectionHealth.lastHeartbeat = Date.now();
          this.reconnectAttempts = 0;
          
          // Request initial memory sync
          this.sendMessage({
            type: 'sync_memory',
            timestamp: Date.now()
          });
          
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
            this.connectionHealth.messagesReceived++;
            this.connectionHealth.lastHeartbeat = Date.now();
          } catch (error) {
            console.error('Failed to parse message from Marley:', error);
            this.connectionHealth.errorsCount++;
          }
        });

        this.ws.on('error', (error) => {
          console.error('Marley Memory Bridge WebSocket error:', error);
          this.connectionHealth.errorsCount++;
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('🔌 Marley Memory Bridge connection closed');
          this.connectionHealth.connected = false;
          this.handleDisconnection();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    const timestamp = Date.now();

    switch (message.type) {
      case 'sync_result':
        this.handleSyncResult(message.data, timestamp);
        break;
      
      case 'harmonization_result':
        this.handleHarmonizationResult(message.data, timestamp);
        break;
      
      case 'spectral_analysis':
        this.handleSpectralAnalysis(message.data, timestamp);
        break;
      
      case 'error':
        this.handleError(message.data, timestamp);
        break;
      
      default:
        console.log('Unknown message type from Marley:', message.type);
    }
  }

  private handleSyncResult(data: any, timestamp: number): void {
    const syncEvent: MemorySyncEvent = {
      type: 'sync_complete',
      timestamp,
      data,
      nodeCount: data.synchronized_nodes,
      duration: timestamp - (this.lastSyncStart || timestamp)
    };

    // Create performance metrics from sync result
    const memoryMetrics: MarleyMemoryMetrics = {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      rss: process.memoryUsage().rss,
      external: process.memoryUsage().external,
      cacheHitRatio: this.calculateCacheHitRatio(data),
      
      spectralAlignment: {
        frequency: data.total_spectral_frequency || 0,
        resonanceThreads: data.unique_resonance_threads || 0,
        connectionDensity: this.calculateConnectionDensity(data),
        structuralDepth: this.calculateStructuralDepth(data),
        harmonizationQuality: this.calculateHarmonizationQuality(data),
        alignmentEfficiency: this.calculateAlignmentEfficiency(data)
      },
      
      memoryNodeProcessing: {
        nodesPerSecond: this.calculateNodesPerSecond(data, syncEvent.duration || 1000),
        averageProcessingTime: (syncEvent.duration || 0) / (data.synchronized_nodes || 1),
        spectralAnalysisTime: data.spectral_analysis_time || 0,
        harmonizationTime: data.harmonization_time || 0,
        resonanceExtractionTime: data.resonance_extraction_time || 0
      },
      
      airtablePerformance: {
        apiLatency: data.airtable_latency || 0,
        rateLimitHits: data.rate_limit_hits || 0,
        errorRate: data.error_rate || 0,
        syncSuccessRate: data.sync_success_rate || 1.0
      },
      
      crossPlatformCompatibility: {
        obsidianCompatibility: data.obsidian_compatibility || 1.0,
        githubCompatibility: data.github_compatibility || 1.0,
        hugoCompatibility: data.hugo_compatibility || 1.0,
        pandocCompatibility: data.pandoc_compatibility || 1.0,
        overallCompatibilityScore: data.overall_compatibility || 1.0
      }
    };

    // Create performance metric for collection
    const performanceMetric: PerformanceMetric = {
      id: `memory-sync-${timestamp}`,
      timestamp,
      source: MetricSource.MEMORY,
      type: MetricType.MEMORY_SYNC_DURATION,
      value: syncEvent.duration || 0,
      unit: 'ms',
      tags: {
        nodeCount: data.synchronized_nodes?.toString() || '0',
        spectralFrequency: data.total_spectral_frequency?.toString() || '0',
        resonanceThreads: data.unique_resonance_threads?.toString() || '0'
      },
      metadata: {
        syncResult: data,
        memoryMetrics,
        spectralData: memoryMetrics.spectralAlignment
      }
    };

    // Emit events
    this.emit('sync_complete', syncEvent);
    this.emit('metrics', memoryMetrics);
    
    // Collect metric
    this.collector.collectMetric(performanceMetric);
    
    console.log(`🌀 Memory sync completed: ${data.synchronized_nodes} nodes, ${syncEvent.duration}ms`);
  }

  private handleHarmonizationResult(data: any, timestamp: number): void {
    const harmonizationEvent: MemorySyncEvent = {
      type: 'harmonization_complete',
      timestamp,
      data,
      spectralData: data.spectral_analysis
    };

    // Create harmonization performance metric
    const harmonizationMetric: PerformanceMetric = {
      id: `harmonization-${timestamp}`,
      timestamp,
      source: MetricSource.MEMORY,
      type: MetricType.HARMONIZATION_QUALITY,
      value: data.spectral_analysis?.frequency || 0,
      unit: 'frequency',
      tags: {
        targetFormat: data.target_format || 'unknown',
        sourceDialect: data.source_dialect || 'unknown'
      },
      metadata: {
        originalContent: data.original_content?.length || 0,
        harmonizedContent: data.harmonized_content?.length || 0,
        spectralAnalysis: data.spectral_analysis
      }
    };

    this.emit('harmonization_complete', harmonizationEvent);
    this.collector.collectMetric(harmonizationMetric);
    
    console.log(`✨ Content harmonized: ${data.target_format} format`);
  }

  private handleSpectralAnalysis(data: any, timestamp: number): void {
    const spectralMetric: PerformanceMetric = {
      id: `spectral-${timestamp}`,
      timestamp,
      source: MetricSource.NEURAL,
      type: MetricType.NEURAL_PROCESSING_TIME,
      value: data.analysis_duration || 0,
      unit: 'ms',
      tags: {
        frequency: data.spectral_frequency?.toString() || '0',
        connections: data.connection_density?.toString() || '0'
      },
      metadata: {
        spectralData: data
      }
    };

    this.collector.collectMetric(spectralMetric);
    console.log(`🔍 Spectral analysis completed: ${data.spectral_frequency} frequency`);
  }

  private handleError(data: any, timestamp: number): void {
    const errorEvent: MemorySyncEvent = {
      type: 'sync_error',
      timestamp,
      data
    };

    this.emit('sync_error', errorEvent);
    this.connectionHealth.errorsCount++;
    console.error('❌ Marley Memory Bridge error:', data);
  }

  private lastSyncStart: number = 0;

  async requestMemorySync(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Marley Memory Bridge');
    }

    this.lastSyncStart = Date.now();
    this.sendMessage({
      type: 'sync_memory',
      timestamp: this.lastSyncStart
    });
  }

  async requestHarmonization(content: string, targetFormat: string = 'obsidian'): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Marley Memory Bridge');
    }

    this.sendMessage({
      type: 'harmonize_content',
      content,
      target_format: targetFormat,
      timestamp: Date.now()
    });
  }

  async requestSpectralAnalysis(content: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Marley Memory Bridge');
    }

    this.sendMessage({
      type: 'spectral_analysis',
      content,
      timestamp: Date.now()
    });
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.connectionHealth.messagesSent++;
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached. Manual intervention required.');
      this.emit('connection_failed');
    }
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      if (this.isConnected()) {
        const timeSinceLastHeartbeat = Date.now() - this.connectionHealth.lastHeartbeat;
        if (timeSinceLastHeartbeat > 30000) { // 30 seconds timeout
          console.warn('⚠️ Heartbeat timeout detected, connection may be stale');
          this.connectionHealth.connected = false;
        }
      }
    }, 10000); // Check every 10 seconds
  }

  isConnected(): boolean {
    return this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN && 
           this.connectionHealth.connected;
  }

  getConnectionHealth() {
    return { ...this.connectionHealth };
  }

  getMemoryMetrics(): MarleyMemoryMetrics[] {
    return [...this.metricsBuffer];
  }

  // Calculation helper methods
  private calculateCacheHitRatio(data: any): number {
    return data.cache_hits / (data.cache_hits + data.cache_misses) || 0;
  }

  private calculateConnectionDensity(data: any): number {
    return data.connection_density || 0;
  }

  private calculateStructuralDepth(data: any): number {
    return data.structural_depth || 0;
  }

  private calculateHarmonizationQuality(data: any): number {
    return data.harmonization_quality || 1.0;
  }

  private calculateAlignmentEfficiency(data: any): number {
    return data.alignment_efficiency || 1.0;
  }

  private calculateNodesPerSecond(data: any, duration: number): number {
    return (data.synchronized_nodes || 0) / (duration / 1000);
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectionHealth.connected = false;
      console.log('🔌 Disconnected from Marley Memory Bridge');
    }
  }
}

export default MarleyMemoryBridge;