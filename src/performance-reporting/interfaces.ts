/**
 * Claude-Flow Performance Reporting System - Core Interfaces
 * Defines the contract for all performance reporting components
 */

import { EventEmitter } from 'events';

// ====== Core Data Types ======

export enum MetricType {
  TASK_DURATION = 'task_duration',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  NETWORK_LATENCY = 'network_latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  AGENT_SPAWN_TIME = 'agent_spawn_time',
  NEURAL_PROCESSING_TIME = 'neural_processing_time',
  SWARM_COORDINATION_TIME = 'swarm_coordination_time',
  TOKEN_USAGE = 'token_usage',
  RESPONSE_TIME = 'response_time',
  CONCURRENT_AGENTS = 'concurrent_agents'
}

export enum MetricSource {
  AGENT = 'agent',
  COORDINATOR = 'coordinator',
  MEMORY = 'memory',
  NEURAL = 'neural',
  SYSTEM = 'system'
}

export enum MetricPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum MetricCategory {
  PERFORMANCE = 'performance',
  RESOURCE = 'resource',
  ERROR = 'error',
  BUSINESS = 'business',
  SECURITY = 'security'
}

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  swarmId: string;
  agentId?: string;
  metricType: MetricType;
  value: number | object | string;
  unit: string;
  tags: Record<string, string>;
  metadata: MetricMetadata;
}

export interface MetricMetadata {
  source: MetricSource;
  priority: MetricPriority;
  category: MetricCategory;
  dimensions: string[];
  context?: Record<string, any>;
}

export interface SwarmMetrics {
  swarmId: string;
  startTime: number;
  endTime: number;
  metrics: PerformanceMetric[];
  configuration: SwarmConfiguration;
  summary: MetricsSummary;
}

export interface SwarmConfiguration {
  topology: string;
  agentCount: number;
  agentTypes: string[];
  memoryConfig: Record<string, any>;
  neuralConfig: Record<string, any>;
  customSettings: Record<string, any>;
}

export interface MetricsSummary {
  totalTasks: number;
  successRate: number;
  avgExecutionTime: number;
  peakMemoryUsage: number;
  errorCount: number;
  tokenConsumption: number;
}

// ====== Analysis Types ======

export interface AnalysisResult {
  id: string;
  swarmId: string;
  timestamp: number;
  insights: Insight[];
  anomalies: Anomaly[];
  trends: TrendAnalysis[];
  statistics: StatisticalSummary;
  recommendations: Recommendation[];
}

export interface Insight {
  id: string;
  type: 'performance' | 'efficiency' | 'optimization' | 'warning';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  supportingMetrics: string[];
  actionable: boolean;
}

export interface Anomaly {
  id: string;
  metricType: MetricType;
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  possibleCauses: string[];
}

export interface TrendAnalysis {
  metricType: MetricType;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number;
  confidence: number;
  timeRange: { start: number; end: number };
  prediction?: TrendPrediction;
}

export interface TrendPrediction {
  nextValue: number;
  confidence: number;
  timeHorizon: number;
  factors: string[];
}

export interface StatisticalSummary {
  metrics: Record<MetricType, MetricStatistics>;
  correlations: CorrelationMatrix;
  distributions: Record<MetricType, Distribution>;
}

export interface MetricStatistics {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: { p50: number; p90: number; p95: number; p99: number };
}

export interface CorrelationMatrix {
  pairs: CorrelationPair[];
}

export interface CorrelationPair {
  metric1: MetricType;
  metric2: MetricType;
  correlation: number;
  significance: number;
}

export interface Distribution {
  type: 'normal' | 'skewed' | 'bimodal' | 'uniform';
  parameters: Record<string, number>;
  histogram: HistogramBin[];
}

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
  frequency: number;
}

// ====== Comparison Types ======

export interface ComparisonResult {
  id: string;
  timestamp: number;
  swarms: SwarmComparison[];
  overallWinner?: string;
  comparisonMatrix: ComparisonMatrix;
  recommendations: ComparisonRecommendation[];
}

export interface SwarmComparison {
  swarmId: string;
  rank: number;
  score: number;
  strengths: string[];
  weaknesses: string[];
  metricComparisons: MetricComparison[];
}

export interface MetricComparison {
  metricType: MetricType;
  values: Record<string, number>;
  bestSwarm: string;
  worstSwarm: string;
  percentageDifference: number;
  statisticalSignificance: number;
}

export interface ComparisonMatrix {
  metrics: MetricType[];
  swarms: string[];
  matrix: number[][];
  weights: Record<MetricType, number>;
}

export interface ComparisonRecommendation {
  title: string;
  description: string;
  targetSwarm: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
}

export interface BenchmarkResult extends ComparisonResult {
  baseline: string;
  improvements: Record<string, number>;
  regressions: Record<string, number>;
}

export interface PerformanceRanking {
  rankings: SwarmRanking[];
  criteria: RankingCriteria[];
  methodology: string;
}

export interface SwarmRanking {
  swarmId: string;
  overallRank: number;
  overallScore: number;
  metricRanks: Record<MetricType, number>;
  metricScores: Record<MetricType, number>;
}

export interface RankingCriteria {
  metricType: MetricType;
  weight: number;
  direction: 'higher_better' | 'lower_better';
  normalization: 'min_max' | 'z_score' | 'percentile';
}

// ====== Report Types ======

export enum OutputFormat {
  JSON = 'json',
  HTML = 'html',
  MARKDOWN = 'markdown',
  PDF = 'pdf'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  SCATTER = 'scatter',
  HISTOGRAM = 'histogram',
  HEATMAP = 'heatmap',
  PIE = 'pie',
  AREA = 'area',
  GAUGE = 'gauge'
}

export enum ExportFormat {
  PNG = 'png',
  SVG = 'svg',
  PDF = 'pdf',
  JPEG = 'jpeg'
}

export interface Report {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  format: OutputFormat;
  content: ReportContent;
  metadata: ReportMetadata;
}

export interface ReportContent {
  summary: ReportSummary;
  sections: ReportSection[];
  visualizations: Visualization[];
  appendices: ReportAppendix[];
}

export interface ReportSummary {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  data?: any;
  visualizations?: string[];
  subsections?: ReportSection[];
}

export interface ReportAppendix {
  title: string;
  content: string;
  data?: any;
}

export interface ReportMetadata {
  author: string;
  version: string;
  swarms: string[];
  timeRange: TimeRange;
  generationTime: number;
  dataPoints: number;
}

export interface TimeRange {
  start: number;
  end: number;
  granularity: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  outputFormat: OutputFormat;
  timeRange: TimeRange;
  metrics: MetricSelector[];
  visualizations: VisualizationConfig[];
  filters: ReportFilter[];
  template?: string;
  schedule?: ScheduleConfig;
}

export interface MetricSelector {
  metricType: MetricType;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p95' | 'p99';
  groupBy: string[];
  filters?: Record<string, any>;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  timezone?: string;
  enabled: boolean;
  recipients?: string[];
}

// ====== Visualization Types ======

export interface Visualization {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: ChartData;
  config: ChartConfig;
  metadata: VisualizationMetadata;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  annotations?: ChartAnnotation[];
}

export interface ChartDataset {
  label: string;
  data: number[] | { x: number; y: number }[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartAnnotation {
  type: 'line' | 'box' | 'point' | 'text';
  value?: number;
  label?: string;
  color?: string;
  coordinates?: { x: number; y: number };
}

export interface ChartConfig {
  responsive: boolean;
  animation: boolean;
  legend: boolean;
  scales?: ScaleConfig;
  plugins?: PluginConfig;
  interaction?: InteractionConfig;
}

export interface ScaleConfig {
  x?: AxisConfig;
  y?: AxisConfig;
}

export interface AxisConfig {
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  title?: string;
  grid?: boolean;
}

export interface PluginConfig {
  tooltip?: boolean;
  zoom?: boolean;
  pan?: boolean;
}

export interface InteractionConfig {
  mode: 'point' | 'nearest' | 'index' | 'dataset';
  intersect: boolean;
}

export interface VisualizationMetadata {
  createdAt: number;
  dataRange: TimeRange;
  metricTypes: MetricType[];
  swarmIds: string[];
  renderTime?: number;
}

export interface VisualizationConfig {
  type: ChartType;
  metricType: MetricType;
  aggregation: string;
  timeRange?: TimeRange;
  groupBy?: string[];
  filters?: ReportFilter[];
  styling?: ChartStyling;
}

export interface ChartStyling {
  colorScheme?: string;
  backgroundColor?: string;
  gridColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval?: number;
  autoRefresh: boolean;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  margin: number;
  responsive: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'text';
  position: { x: number; y: number; width: number; height: number };
  config: WidgetConfig;
  data?: any;
}

export interface WidgetConfig {
  visualization?: VisualizationConfig;
  metric?: MetricSelector;
  refreshInterval?: number;
  styling?: Record<string, any>;
}

export interface DashboardConfig {
  title: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  timeRange: TimeRange;
  autoRefresh: boolean;
  refreshInterval: number;
}

// ====== Configuration Types ======

export interface CollectorConfig {
  enabled: boolean;
  interval: number;
  batchSize: number;
  bufferSize: number;
  timeout: number;
  retryAttempts: number;
  sources: MetricSource[];
  excludeMetrics?: MetricType[];
  sampling?: SamplingConfig;
}

export interface SamplingConfig {
  enabled: boolean;
  rate: number;
  strategy: 'uniform' | 'adaptive' | 'priority';
}

export interface AnalyzerConfig {
  enabled: boolean;
  analysisInterval: number;
  anomalyDetection: AnomalyDetectionConfig;
  trendAnalysis: TrendAnalysisConfig;
  statisticalMethods: string[];
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: number;
  methods: ('zscore' | 'iqr' | 'isolation_forest' | 'lstm')[];
  windowSize: number;
}

export interface TrendAnalysisConfig {
  enabled: boolean;
  methods: ('linear' | 'exponential' | 'seasonal')[];
  predictionHorizon: number;
  confidence: number;
}

export interface ComparisonConfig {
  enabled: boolean;
  maxSwarms: number;
  significanceLevel: number;
  rankingWeights: Record<MetricType, number>;
  benchmarkThresholds: Record<MetricType, number>;
}

// ====== Component Interfaces ======

export interface IPerformanceCollector extends EventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;
  configure(config: CollectorConfig): void;
  collect(swarmId: string, duration?: number): Promise<PerformanceMetric[]>;
  collectRealtime(swarmId: string): AsyncIterableIterator<PerformanceMetric>;
  subscribe(metricType: MetricType, callback: MetricCallback): void;
  unsubscribe(metricType: MetricType, callback: MetricCallback): void;
  getStatus(): CollectorStatus;
}

export interface IMetricsAnalyzer {
  analyze(metrics: PerformanceMetric[]): Promise<AnalysisResult>;
  detectAnomalies(metrics: PerformanceMetric[]): Promise<Anomaly[]>;
  analyzeTrends(metrics: PerformanceMetric[]): Promise<TrendAnalysis[]>;
  generateInsights(analysis: AnalysisResult): Promise<Insight[]>;
  calculateStatistics(metrics: PerformanceMetric[]): Promise<StatisticalSummary>;
  findCorrelations(metrics: PerformanceMetric[]): Promise<CorrelationMatrix>;
}

export interface IComparisonEngine {
  compare(swarms: SwarmMetrics[]): Promise<ComparisonResult>;
  benchmark(baseline: SwarmMetrics, candidates: SwarmMetrics[]): Promise<BenchmarkResult>;
  rankPerformance(swarms: SwarmMetrics[], criteria: RankingCriteria[]): Promise<PerformanceRanking>;
  generateRecommendations(comparison: ComparisonResult): Promise<ComparisonRecommendation[]>;
}

export interface IReportGenerator {
  generate(config: ReportConfig, data: AnalysisResult): Promise<Report>;
  export(report: Report, format: OutputFormat): Promise<string>;
  schedule(config: ReportConfig): Promise<void>;
  getScheduledReports(): Promise<ScheduledReport[]>;
  cancelScheduledReport(reportId: string): Promise<void>;
}

export interface IVisualizationRenderer {
  renderChart(config: VisualizationConfig, data: ChartData): Promise<Visualization>;
  renderDashboard(config: DashboardConfig, data: Record<string, any>): Promise<Dashboard>;
  exportVisualization(viz: Visualization, format: ExportFormat): Promise<Buffer>;
  generateThumbnail(viz: Visualization): Promise<Buffer>;
}

// ====== Event Types ======

export interface MetricEvent {
  type: 'metric_collected' | 'metric_analyzed' | 'anomaly_detected' | 'report_generated';
  timestamp: number;
  swarmId?: string;
  data: any;
}

export interface CollectorStatus {
  isRunning: boolean;
  lastCollection: number;
  metricsCollected: number;
  errorCount: number;
  avgCollectionTime: number;
}

export interface ScheduledReport {
  id: string;
  config: ReportConfig;
  nextRun: number;
  lastRun?: number;
  status: 'active' | 'paused' | 'error';
}

// ====== Callback Types ======

export type MetricCallback = (metric: PerformanceMetric) => void;
export type AnalysisCallback = (analysis: AnalysisResult) => void;
export type ReportCallback = (report: Report) => void;
export type AnomalyCallback = (anomaly: Anomaly) => void;

// ====== Error Types ======

export class PerformanceReportingError extends Error {
  constructor(
    message: string,
    public code: string,
    public component: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PerformanceReportingError';
  }
}

export enum ErrorCode {
  COLLECTOR_INIT_FAILED = 'COLLECTOR_INIT_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  COMPARISON_FAILED = 'COMPARISON_FAILED',
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
  VISUALIZATION_RENDERING_FAILED = 'VISUALIZATION_RENDERING_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}