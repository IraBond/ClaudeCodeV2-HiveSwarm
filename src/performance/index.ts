/**
 * Performance Analysis Engine - Main Export
 * Provides unified access to all performance analysis capabilities
 */

// Core exports
export { MetricsCollector } from './core/MetricsCollector';

// Analysis engines
export { StatisticalAnalyzer } from './analysis/StatisticalAnalyzer';
export { TrendAnalyzer } from './analysis/TrendAnalyzer';
export { ResourceAnalyzer } from './analysis/ResourceAnalyzer';
export { BottleneckDetector } from './analysis/BottleneckDetector';

// Services
export { PerformanceAnalysisService } from './services/PerformanceAnalysisService';

// Utilities
export { ReportGenerator } from './utils/ReportGenerator';
export { PerformanceLogger } from './utils/PerformanceLogger';
export { ErrorHandler } from './utils/ErrorHandler';

// Types (re-export all types)
export * from './types';

// Factory function for easy setup
export { createPerformanceAnalysisEngine } from './factory/PerformanceAnalysisFactory';