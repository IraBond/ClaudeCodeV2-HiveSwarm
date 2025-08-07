/**
 * Claude-Flow Performance Reporting System - Metrics Analyzer
 * Responsible for processing and analyzing performance data
 */

import {
  IMetricsAnalyzer,
  PerformanceMetric,
  AnalysisResult,
  Anomaly,
  TrendAnalysis,
  Insight,
  StatisticalSummary,
  CorrelationMatrix,
  MetricStatistics,
  CorrelationPair,
  Distribution,
  HistogramBin,
  TrendPrediction,
  MetricType,
  PerformanceReportingError,
  ErrorCode
} from './interfaces.js';

export class MetricsAnalyzer implements IMetricsAnalyzer {
  private readonly ANOMALY_THRESHOLD = 2.5; // Z-score threshold
  private readonly MIN_CORRELATION = 0.3; // Minimum correlation to report
  private readonly TREND_CONFIDENCE_THRESHOLD = 0.7;

  async analyze(metrics: PerformanceMetric[]): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();
      
      // Validate input data
      this.validateMetrics(metrics);
      
      if (metrics.length === 0) {
        throw new Error('No metrics provided for analysis');
      }

      const swarmId = metrics[0].swarmId;

      // Perform parallel analysis
      const [statistics, anomalies, trends, insights] = await Promise.all([
        this.calculateStatistics(metrics),
        this.detectAnomalies(metrics),
        this.analyzeTrends(metrics),
        this.generateInsights(metrics)
      ]);

      // Generate recommendations based on analysis
      const recommendations = await this.generateRecommendations(statistics, anomalies, trends, insights);

      const analysisResult: AnalysisResult = {
        id: this.generateAnalysisId(),
        swarmId,
        timestamp: Date.now(),
        insights,
        anomalies,
        trends,
        statistics,
        recommendations
      };

      console.log(`📊 Analysis completed for ${swarmId} in ${Date.now() - startTime}ms`);
      return analysisResult;

    } catch (error) {
      throw new PerformanceReportingError(
        `Metrics analysis failed: ${error.message}`,
        ErrorCode.ANALYSIS_FAILED,
        'MetricsAnalyzer',
        { metricCount: metrics.length, error: error.message }
      );
    }
  }

  async detectAnomalies(metrics: PerformanceMetric[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const metricsByType = this.groupMetricsByType(metrics);

    for (const [metricType, typeMetrics] of metricsByType.entries()) {
      const values = typeMetrics.map(m => Number(m.value)).filter(v => !isNaN(v));
      if (values.length < 5) continue; // Need minimum data for anomaly detection

      const stats = this.calculateBasicStats(values);
      const anomalousIndices = this.detectZScoreAnomalies(values, stats, this.ANOMALY_THRESHOLD);

      for (const index of anomalousIndices) {
        const metric = typeMetrics[index];
        const value = Number(metric.value);
        const zScore = Math.abs((value - stats.mean) / stats.stdDev);
        const deviation = Math.abs(value - stats.mean) / stats.mean;

        anomalies.push({
          id: this.generateAnomalyId(),
          metricType,
          timestamp: metric.timestamp,
          value,
          expectedValue: stats.mean,
          deviation,
          severity: this.determineSeverity(zScore, deviation),
          description: this.generateAnomalyDescription(metricType, value, stats.mean, deviation),
          possibleCauses: this.generatePossibleCauses(metricType, value, stats.mean)
        });
      }
    }

    return anomalies.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
  }

  async analyzeTrends(metrics: PerformanceMetric[]): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];
    const metricsByType = this.groupMetricsByType(metrics);

    for (const [metricType, typeMetrics] of metricsByType.entries()) {
      const sortedMetrics = typeMetrics.sort((a, b) => a.timestamp - b.timestamp);
      const values = sortedMetrics.map(m => Number(m.value)).filter(v => !isNaN(v));
      
      if (values.length < 10) continue; // Need sufficient data for trend analysis

      const timestamps = sortedMetrics.slice(0, values.length).map(m => m.timestamp);
      const trendResult = this.calculateLinearTrend(timestamps, values);
      
      if (Math.abs(trendResult.slope) > 1e-10) { // Only report significant trends
        const prediction = await this.predictNextValue(timestamps, values, trendResult);

        trends.push({
          metricType,
          direction: trendResult.slope > 0 ? 'improving' : 'degrading',
          rate: Math.abs(trendResult.slope),
          confidence: trendResult.rSquared,
          timeRange: {
            start: timestamps[0],
            end: timestamps[timestamps.length - 1]
          },
          prediction: trendResult.rSquared > this.TREND_CONFIDENCE_THRESHOLD ? prediction : undefined
        });
      }
    }

    return trends;
  }

  async generateInsights(metrics: PerformanceMetric[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    const statistics = await this.calculateStatistics(metrics);
    
    // Performance insights
    insights.push(...this.generatePerformanceInsights(statistics));
    
    // Resource utilization insights
    insights.push(...this.generateResourceInsights(statistics));
    
    // Reliability insights
    insights.push(...this.generateReliabilityInsights(statistics));
    
    // Efficiency insights
    insights.push(...this.generateEfficiencyInsights(statistics, metrics));

    return insights
      .filter(insight => insight.confidence > 0.5)
      .sort((a, b) => this.getImpactScore(b.impact) - this.getImpactScore(a.impact));
  }

  async calculateStatistics(metrics: PerformanceMetric[]): Promise<StatisticalSummary> {
    const metricsByType = this.groupMetricsByType(metrics);
    const statisticsByType: Record<MetricType, MetricStatistics> = {} as any;
    const distributions: Record<MetricType, Distribution> = {} as any;

    // Calculate statistics for each metric type
    for (const [metricType, typeMetrics] of metricsByType.entries()) {
      const values = typeMetrics.map(m => Number(m.value)).filter(v => !isNaN(v));
      if (values.length === 0) continue;

      statisticsByType[metricType] = this.calculateMetricStatistics(values);
      distributions[metricType] = this.analyzeDistribution(values);
    }

    // Calculate correlations
    const correlations = await this.findCorrelations(metrics);

    return {
      metrics: statisticsByType,
      correlations,
      distributions
    };
  }

  async findCorrelations(metrics: PerformanceMetric[]): Promise<CorrelationMatrix> {
    const pairs: CorrelationPair[] = [];
    const metricsByType = this.groupMetricsByType(metrics);
    const metricTypes = Array.from(metricsByType.keys());

    // Calculate correlations between all metric type pairs
    for (let i = 0; i < metricTypes.length; i++) {
      for (let j = i + 1; j < metricTypes.length; j++) {
        const type1 = metricTypes[i];
        const type2 = metricTypes[j];
        
        const values1 = metricsByType.get(type1)!.map(m => Number(m.value)).filter(v => !isNaN(v));
        const values2 = metricsByType.get(type2)!.map(m => Number(m.value)).filter(v => !isNaN(v));
        
        if (values1.length < 5 || values2.length < 5) continue;
        
        // Align data points by timestamp
        const alignedData = this.alignMetricsByTimestamp(
          metricsByType.get(type1)!,
          metricsByType.get(type2)!
        );
        
        if (alignedData.length < 5) continue;
        
        const correlation = this.calculatePearsonCorrelation(
          alignedData.map(d => d.value1),
          alignedData.map(d => d.value2)
        );
        
        if (Math.abs(correlation.r) >= this.MIN_CORRELATION) {
          pairs.push({
            metric1: type1,
            metric2: type2,
            correlation: correlation.r,
            significance: correlation.pValue
          });
        }
      }
    }

    return { pairs };
  }

  // Private helper methods

  private validateMetrics(metrics: PerformanceMetric[]): void {
    if (!Array.isArray(metrics)) {
      throw new Error('Metrics must be an array');
    }

    for (const metric of metrics) {
      if (!metric.id || !metric.timestamp || !metric.swarmId || !metric.metricType) {
        throw new Error('Invalid metric structure');
      }
    }
  }

  private groupMetricsByType(metrics: PerformanceMetric[]): Map<MetricType, PerformanceMetric[]> {
    const grouped = new Map<MetricType, PerformanceMetric[]>();
    
    for (const metric of metrics) {
      if (!grouped.has(metric.metricType)) {
        grouped.set(metric.metricType, []);
      }
      grouped.get(metric.metricType)!.push(metric);
    }
    
    return grouped;
  }

  private calculateBasicStats(values: number[]) {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev, variance, n };
  }

  private calculateMetricStatistics(values: number[]): MetricStatistics {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      count: n,
      mean,
      median: this.calculatePercentile(sorted, 0.5),
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      percentiles: {
        p50: this.calculatePercentile(sorted, 0.5),
        p90: this.calculatePercentile(sorted, 0.9),
        p95: this.calculatePercentile(sorted, 0.95),
        p99: this.calculatePercentile(sorted, 0.99)
      }
    };
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = percentile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
    if (lower === upper) return sortedValues[lower];

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private analyzeDistribution(values: number[]): Distribution {
    const sorted = [...values].sort((a, b) => a - b);
    const stats = this.calculateBasicStats(values);
    
    // Create histogram
    const bins = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (sorted[sorted.length - 1] - sorted[0]) / bins;
    const histogram: HistogramBin[] = [];
    
    for (let i = 0; i < bins; i++) {
      const min = sorted[0] + i * binWidth;
      const max = min + binWidth;
      const count = values.filter(v => v >= min && (i === bins - 1 ? v <= max : v < max)).length;
      
      histogram.push({
        min,
        max,
        count,
        frequency: count / values.length
      });
    }

    // Determine distribution type
    const skewness = this.calculateSkewness(values, stats.mean, stats.stdDev);
    const kurtosis = this.calculateKurtosis(values, stats.mean, stats.stdDev);
    
    let type: 'normal' | 'skewed' | 'bimodal' | 'uniform' = 'normal';
    if (Math.abs(skewness) > 1) type = 'skewed';
    else if (kurtosis < -1) type = 'uniform';
    // Bimodal detection would require more sophisticated analysis

    return {
      type,
      parameters: { mean: stats.mean, stdDev: stats.stdDev, skewness, kurtosis },
      histogram
    };
  }

  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const skewSum = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * skewSum;
  }

  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const kurtSum = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  private detectZScoreAnomalies(values: number[], stats: any, threshold: number): number[] {
    return values
      .map((value, index) => ({ value, index, zScore: Math.abs((value - stats.mean) / stats.stdDev) }))
      .filter(item => item.zScore > threshold)
      .map(item => item.index);
  }

  private determineSeverity(zScore: number, deviation: number): 'critical' | 'warning' | 'info' {
    if (zScore > 4 || deviation > 0.5) return 'critical';
    if (zScore > 3 || deviation > 0.3) return 'warning';
    return 'info';
  }

  private generateAnomalyDescription(
    metricType: MetricType, 
    value: number, 
    expected: number, 
    deviation: number
  ): string {
    const direction = value > expected ? 'above' : 'below';
    const percentage = (deviation * 100).toFixed(1);
    
    return `${metricType} value ${value.toFixed(2)} is ${percentage}% ${direction} expected value ${expected.toFixed(2)}`;
  }

  private generatePossibleCauses(metricType: MetricType, value: number, expected: number): string[] {
    const causes: string[] = [];
    
    switch (metricType) {
      case MetricType.TASK_DURATION:
        if (value > expected) {
          causes.push('Increased task complexity', 'Resource contention', 'Network latency', 'External service delays');
        } else {
          causes.push('Task optimization', 'Reduced data processing', 'Caching effects');
        }
        break;
      case MetricType.MEMORY_USAGE:
        if (value > expected) {
          causes.push('Memory leaks', 'Large dataset processing', 'Insufficient garbage collection');
        } else {
          causes.push('Optimized algorithms', 'Data compression', 'Memory cleanup');
        }
        break;
      case MetricType.ERROR_RATE:
        if (value > expected) {
          causes.push('Input validation failures', 'External service errors', 'Configuration issues', 'Resource exhaustion');
        } else {
          causes.push('Improved error handling', 'Better input validation', 'System stabilization');
        }
        break;
      default:
        causes.push('System load variations', 'Configuration changes', 'Environmental factors');
    }
    
    return causes;
  }

  private calculateLinearTrend(timestamps: number[], values: number[]) {
    const n = values.length;
    const normalizedTimestamps = timestamps.map(t => (t - timestamps[0]) / (1000 * 60)); // Convert to minutes
    
    const sumX = normalizedTimestamps.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = normalizedTimestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = normalizedTimestamps.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = normalizedTimestamps.reduce((sum, x, i) => {
      const predicted = slope * x + intercept;
      return sum + Math.pow(values[i] - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    return { slope, intercept, rSquared };
  }

  private async predictNextValue(
    timestamps: number[], 
    values: number[], 
    trendResult: any
  ): Promise<TrendPrediction> {
    const lastTimestamp = timestamps[timestamps.length - 1];
    const futureTimestamp = lastTimestamp + (60 * 1000); // 1 minute ahead
    const normalizedFuture = (futureTimestamp - timestamps[0]) / (1000 * 60);
    
    const nextValue = trendResult.slope * normalizedFuture + trendResult.intercept;
    
    return {
      nextValue: Math.max(0, nextValue), // Ensure non-negative
      confidence: trendResult.rSquared,
      timeHorizon: 60 * 1000, // 1 minute
      factors: ['historical trend', 'linear regression']
    };
  }

  private generatePerformanceInsights(statistics: StatisticalSummary): Insight[] {
    const insights: Insight[] = [];
    
    // Task duration insights
    const taskStats = statistics.metrics[MetricType.TASK_DURATION];
    if (taskStats) {
      if (taskStats.percentiles.p95 > taskStats.mean * 2) {
        insights.push({
          id: this.generateInsightId(),
          type: 'performance',
          title: 'High Task Duration Variance',
          description: `95th percentile task duration (${taskStats.percentiles.p95.toFixed(2)}ms) is significantly higher than average (${taskStats.mean.toFixed(2)}ms), indicating inconsistent performance.`,
          impact: 'high',
          confidence: 0.9,
          supportingMetrics: [MetricType.TASK_DURATION],
          actionable: true
        });
      }
    }
    
    return insights;
  }

  private generateResourceInsights(statistics: StatisticalSummary): Insight[] {
    const insights: Insight[] = [];
    
    // Memory usage insights
    const memoryStats = statistics.metrics[MetricType.MEMORY_USAGE];
    if (memoryStats && memoryStats.mean > 0.8) {
      insights.push({
        id: this.generateInsightId(),
        type: 'optimization',
        title: 'High Memory Utilization',
        description: `Average memory usage is ${(memoryStats.mean * 100).toFixed(1)}%, indicating potential memory pressure.`,
        impact: 'high',
        confidence: 0.8,
        supportingMetrics: [MetricType.MEMORY_USAGE],
        actionable: true
      });
    }
    
    return insights;
  }

  private generateReliabilityInsights(statistics: StatisticalSummary): Insight[] {
    const insights: Insight[] = [];
    
    // Error rate insights
    const errorStats = statistics.metrics[MetricType.ERROR_RATE];
    if (errorStats && errorStats.mean > 0.05) {
      insights.push({
        id: this.generateInsightId(),
        type: 'warning',
        title: 'Elevated Error Rate',
        description: `Error rate of ${(errorStats.mean * 100).toFixed(2)}% exceeds recommended threshold of 5%.`,
        impact: 'high',
        confidence: 0.95,
        supportingMetrics: [MetricType.ERROR_RATE],
        actionable: true
      });
    }
    
    return insights;
  }

  private generateEfficiencyInsights(statistics: StatisticalSummary, metrics: PerformanceMetric[]): Insight[] {
    const insights: Insight[] = [];
    
    // Token usage efficiency
    const tokenStats = statistics.metrics[MetricType.TOKEN_USAGE];
    const taskStats = statistics.metrics[MetricType.TASK_DURATION];
    
    if (tokenStats && taskStats) {
      const tokenPerMs = tokenStats.mean / taskStats.mean;
      if (tokenPerMs > 10) {
        insights.push({
          id: this.generateInsightId(),
          type: 'efficiency',
          title: 'High Token Usage Rate',
          description: `Token consumption rate of ${tokenPerMs.toFixed(2)} tokens/ms suggests inefficient processing.`,
          impact: 'medium',
          confidence: 0.7,
          supportingMetrics: [MetricType.TOKEN_USAGE, MetricType.TASK_DURATION],
          actionable: true
        });
      }
    }
    
    return insights;
  }

  private alignMetricsByTimestamp(metrics1: PerformanceMetric[], metrics2: PerformanceMetric[]) {
    const aligned: { value1: number; value2: number; timestamp: number }[] = [];
    const tolerance = 5000; // 5 second tolerance
    
    for (const m1 of metrics1) {
      const value1 = Number(m1.value);
      if (isNaN(value1)) continue;
      
      const matchingMetric = metrics2.find(m2 => 
        Math.abs(m2.timestamp - m1.timestamp) <= tolerance
      );
      
      if (matchingMetric) {
        const value2 = Number(matchingMetric.value);
        if (!isNaN(value2)) {
          aligned.push({
            value1,
            value2,
            timestamp: m1.timestamp
          });
        }
      }
    }
    
    return aligned;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    const r = denominator === 0 ? 0 : numerator / denominator;
    
    // Calculate p-value (simplified)
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const pValue = 2 * (1 - this.studentTCDF(Math.abs(t), n - 2));
    
    return { r, pValue };
  }

  private studentTCDF(t: number, df: number): number {
    // Simplified Student's t-distribution CDF approximation
    const x = df / (df + t * t);
    return 1 - 0.5 * this.incompleteBeta(df / 2, 0.5, x);
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    // Simplified incomplete beta function approximation
    if (x === 0) return 0;
    if (x === 1) return 1;
    return Math.pow(x, a) * Math.pow(1 - x, b) / (a + b);
  }

  private async generateRecommendations(
    statistics: StatisticalSummary,
    anomalies: Anomaly[],
    trends: TrendAnalysis[],
    insights: Insight[]
  ) {
    const recommendations: any[] = [];
    
    // High-impact insights become recommendations
    const highImpactInsights = insights.filter(insight => insight.impact === 'high');
    for (const insight of highImpactInsights) {
      recommendations.push({
        title: `Address ${insight.title}`,
        description: insight.description,
        priority: 'high',
        expectedImprovement: 0.2,
        effort: 'medium'
      });
    }
    
    // Critical anomalies become recommendations
    const criticalAnomalies = anomalies.filter(anomaly => anomaly.severity === 'critical');
    for (const anomaly of criticalAnomalies) {
      recommendations.push({
        title: `Investigate Critical Anomaly in ${anomaly.metricType}`,
        description: anomaly.description,
        priority: 'high',
        expectedImprovement: 0.3,
        effort: 'high'
      });
    }
    
    // Degrading trends become recommendations
    const degradingTrends = trends.filter(trend => 
      trend.direction === 'degrading' && trend.confidence > this.TREND_CONFIDENCE_THRESHOLD
    );
    for (const trend of degradingTrends) {
      recommendations.push({
        title: `Address Degrading Trend in ${trend.metricType}`,
        description: `${trend.metricType} is trending negatively with ${(trend.confidence * 100).toFixed(1)}% confidence`,
        priority: 'medium',
        expectedImprovement: 0.15,
        effort: 'medium'
      });
    }
    
    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  private getSeverityScore(severity: 'critical' | 'warning' | 'info'): number {
    return severity === 'critical' ? 3 : severity === 'warning' ? 2 : 1;
  }

  private getImpactScore(impact: 'high' | 'medium' | 'low'): number {
    return impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}