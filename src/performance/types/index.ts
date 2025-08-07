/**
 * Performance Analysis Engine - Type Definitions
 * Core types for swarm performance monitoring and analysis
 */

// Core Performance Metrics
export interface PerformanceMetric {
  id: string;
  timestamp: number;
  agentId?: string;
  swarmId?: string;
  metricType: MetricType;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface SwarmOperationMetrics {
  operationId: string;
  swarmId: string;
  operationType: SwarmOperationType;
  startTime: number;
  endTime?: number;
  duration?: number;
  agentCount: number;
  taskCount: number;
  successRate: number;
  throughput: number;
  latency: number;
  resourceUsage: ResourceUsage;
  errors: OperationError[];
  metadata: Record<string, any>;
}

export interface ResourceUsage {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  network: ResourceMetric;
  storage: ResourceMetric;
  custom?: Record<string, ResourceMetric>;
}

export interface ResourceMetric {
  current: number;
  peak: number;
  average: number;
  unit: string;
  utilization: number; // Percentage
  timestamps: number[];
  values: number[];
}

export interface OperationError {
  timestamp: number;
  agentId?: string;
  errorType: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
}

// Performance Analysis Results
export interface PerformanceAnalysisResult {
  analysisId: string;
  timestamp: number;
  timeRange: TimeRange;
  summary: PerformanceSummary;
  trends: TrendAnalysis[];
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  resourceAnalysis: ResourceAnalysis;
  metadata: Record<string, any>;
}

export interface PerformanceSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatency: number;
  averageThroughput: number;
  peakThroughput: number;
  resourceEfficiency: number;
  overallHealth: HealthStatus;
}

export interface TrendAnalysis {
  metricType: MetricType;
  trend: TrendDirection;
  confidence: number;
  changeRate: number;
  predictions: Prediction[];
  seasonality?: SeasonalityPattern;
}

export interface Bottleneck {
  id: string;
  type: BottleneckType;
  severity: BottleneckSeverity;
  description: string;
  affectedMetrics: string[];
  rootCause?: string;
  impact: ImpactAnalysis;
  suggestions: string[];
  detectedAt: number;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: Priority;
  title: string;
  description: string;
  expectedImpact: ImpactEstimation;
  implementation: ImplementationGuide;
  validatedAt: number;
}

export interface ResourceAnalysis {
  efficiency: EfficiencyMetrics;
  utilization: UtilizationPattern[];
  waste: WasteAnalysis;
  optimization: OptimizationOpportunity[];
}

// Statistical Analysis Types
export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  percentiles: Percentiles;
  outliers: OutlierAnalysis;
}

export interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface OutlierAnalysis {
  method: OutlierDetectionMethod;
  outliers: number[];
  threshold: number;
  count: number;
}

export interface Correlation {
  metric1: string;
  metric2: string;
  coefficient: number;
  strength: CorrelationStrength;
  significance: number;
}

// Time Series Analysis
export interface TimeSeriesData {
  timestamps: number[];
  values: number[];
  metadata?: Record<string, any>;
}

export interface TimeSeriesAnalysis {
  data: TimeSeriesData;
  trend: TrendComponent;
  seasonal: SeasonalComponent;
  residual: ResidualComponent;
  forecast: ForecastResult;
}

export interface TrendComponent {
  direction: TrendDirection;
  strength: number;
  changePoints: ChangePoint[];
}

export interface SeasonalComponent {
  detected: boolean;
  period?: number;
  strength?: number;
  patterns?: SeasonalityPattern[];
}

export interface ResidualComponent {
  values: number[];
  variance: number;
  autocorrelation: number;
}

export interface ForecastResult {
  timestamps: number[];
  values: number[];
  confidenceIntervals: ConfidenceInterval[];
  accuracy: ForecastAccuracy;
}

export interface ConfidenceInterval {
  timestamp: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ForecastAccuracy {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r2: number; // R-squared
}

// Supporting Types
export interface TimeRange {
  start: number;
  end: number;
  duration: number;
}

export interface Prediction {
  timestamp: number;
  value: number;
  confidence: number;
}

export interface ChangePoint {
  timestamp: number;
  previousValue: number;
  newValue: number;
  significance: number;
}

export interface ImpactAnalysis {
  scope: ImpactScope;
  severity: number; // 0-1 scale
  affectedAgents: string[];
  performanceDegradation: number;
  estimatedCost: number;
}

export interface ImpactEstimation {
  performance: number; // Expected improvement percentage
  efficiency: number;
  cost: number; // Implementation cost
  timeframe: number; // Days to implement
}

export interface ImplementationGuide {
  steps: string[];
  estimatedEffort: number; // Hours
  prerequisites: string[];
  risks: string[];
}

export interface EfficiencyMetrics {
  overall: number;
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface UtilizationPattern {
  resource: string;
  pattern: PatternType;
  peakHours: number[];
  averageUtilization: number;
  variance: number;
}

export interface WasteAnalysis {
  totalWaste: number;
  wasteByResource: Record<string, number>;
  wasteReasons: WasteReason[];
}

export interface WasteReason {
  reason: string;
  impact: number;
  frequency: number;
}

export interface OptimizationOpportunity {
  area: string;
  potential: number; // Percentage improvement
  effort: number; // Implementation effort scale 1-10
  priority: number; // Calculated priority score
}

export interface SeasonalityPattern {
  period: number;
  amplitude: number;
  phase: number;
  confidence: number;
}

// Enums
export enum MetricType {
  LATENCY = 'latency',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  SUCCESS_RATE = 'success_rate',
  RESOURCE_CPU = 'resource_cpu',
  RESOURCE_MEMORY = 'resource_memory',
  RESOURCE_NETWORK = 'resource_network',
  RESOURCE_STORAGE = 'resource_storage',
  AGENT_COUNT = 'agent_count',
  TASK_COUNT = 'task_count',
  QUEUE_LENGTH = 'queue_length',
  RESPONSE_TIME = 'response_time',
  CONCURRENT_OPERATIONS = 'concurrent_operations',
  CUSTOM = 'custom'
}

export enum SwarmOperationType {
  INITIALIZATION = 'initialization',
  TASK_EXECUTION = 'task_execution',
  COORDINATION = 'coordination',
  CONSENSUS = 'consensus',
  DATA_SYNC = 'data_sync',
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  FAILOVER = 'failover',
  RECOVERY = 'recovery',
  MAINTENANCE = 'maintenance'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile',
  CYCLICAL = 'cyclical'
}

export enum BottleneckType {
  CPU = 'cpu',
  MEMORY = 'memory',
  NETWORK = 'network',
  STORAGE = 'storage',
  CONCURRENCY = 'concurrency',
  SERIALIZATION = 'serialization',
  COORDINATION = 'coordination',
  EXTERNAL_DEPENDENCY = 'external_dependency'
}

export enum BottleneckSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export enum RecommendationType {
  OPTIMIZATION = 'optimization',
  SCALING = 'scaling',
  CONFIGURATION = 'configuration',
  ARCHITECTURE = 'architecture',
  MONITORING = 'monitoring',
  MAINTENANCE = 'maintenance'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum OutlierDetectionMethod {
  Z_SCORE = 'z_score',
  IQR = 'iqr',
  ISOLATION_FOREST = 'isolation_forest',
  LOCAL_OUTLIER_FACTOR = 'local_outlier_factor'
}

export enum CorrelationStrength {
  NONE = 'none',
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong'
}

export enum ImpactScope {
  AGENT = 'agent',
  SWARM = 'swarm',
  SYSTEM = 'system',
  GLOBAL = 'global'
}

export enum PatternType {
  CONSTANT = 'constant',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  PERIODIC = 'periodic',
  RANDOM = 'random'
}

// Configuration Types
export interface PerformanceAnalysisConfig {
  sampling: SamplingConfig;
  analysis: AnalysisConfig;
  alerting: AlertingConfig;
  storage: StorageConfig;
}

export interface SamplingConfig {
  interval: number; // milliseconds
  batchSize: number;
  retentionPeriod: number; // days
  compressionEnabled: boolean;
}

export interface AnalysisConfig {
  windowSize: number; // minutes
  trendAnalysisWindow: number; // hours
  forecastHorizon: number; // hours
  outlierThreshold: number;
  correlationThreshold: number;
}

export interface AlertingConfig {
  enabled: boolean;
  thresholds: Record<string, number>;
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  type: string;
  config: Record<string, any>;
}

export interface StorageConfig {
  type: 'memory' | 'file' | 'database';
  config: Record<string, any>;
}

// Analysis Engine Interfaces
export interface IPerformanceCollector {
  collect(metrics: PerformanceMetric[]): Promise<void>;
  getMetrics(query: MetricQuery): Promise<PerformanceMetric[]>;
  getSwarmMetrics(swarmId: string, timeRange?: TimeRange): Promise<SwarmOperationMetrics[]>;
}

export interface IStatisticalAnalyzer {
  calculateSummary(values: number[]): StatisticalSummary;
  detectOutliers(values: number[], method?: OutlierDetectionMethod): OutlierAnalysis;
  calculateCorrelations(datasets: Record<string, number[]>): Correlation[];
}

export interface ITrendAnalyzer {
  analyzeTimeSeries(data: TimeSeriesData): TimeSeriesAnalysis;
  detectTrends(data: TimeSeriesData): TrendAnalysis;
  generateForecast(data: TimeSeriesData, horizon: number): ForecastResult;
}

export interface IBottleneckDetector {
  detectBottlenecks(metrics: SwarmOperationMetrics[], config?: BottleneckDetectionConfig): Bottleneck[];
  analyzeResourceBottlenecks(resourceUsage: ResourceUsage[]): Bottleneck[];
  identifyPerformanceAntipatterns(operations: SwarmOperationMetrics[]): Bottleneck[];
}

export interface IResourceAnalyzer {
  analyzeUtilization(resourceMetrics: ResourceMetric[], timeRange: TimeRange): ResourceAnalysis;
  calculateEfficiency(usage: ResourceUsage[], baseline?: ResourceUsage): EfficiencyMetrics;
  identifyWaste(usage: ResourceUsage[]): WasteAnalysis;
}

export interface IPerformanceReporter {
  generateReport(analysis: PerformanceAnalysisResult, format?: ReportFormat): Promise<string>;
  generateDashboard(data: PerformanceAnalysisResult): Promise<DashboardData>;
  exportData(data: any, format: ExportFormat): Promise<Buffer>;
}

export interface MetricQuery {
  timeRange?: TimeRange;
  metricTypes?: MetricType[];
  agentIds?: string[];
  swarmIds?: string[];
  filters?: Record<string, any>;
  aggregation?: AggregationType;
  groupBy?: string[];
}

export interface BottleneckDetectionConfig {
  cpuThreshold: number;
  memoryThreshold: number;
  latencyThreshold: number;
  errorRateThreshold: number;
  throughputThreshold: number;
}

export enum AggregationType {
  NONE = 'none',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count'
}

export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  PDF = 'pdf',
  CSV = 'csv',
  MARKDOWN = 'markdown'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
  PARQUET = 'parquet'
}

export interface DashboardData {
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  metadata: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  data: any;
  config: Record<string, any>;
}

export interface DashboardLayout {
  rows: LayoutRow[];
}

export interface LayoutRow {
  widgets: string[];
  height: number;
}

export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  TABLE = 'table',
  METRIC = 'metric',
  ALERT = 'alert'
}