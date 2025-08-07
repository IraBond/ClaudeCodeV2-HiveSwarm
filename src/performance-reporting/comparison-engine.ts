/**
 * Claude-Flow Performance Reporting System - Comparison Engine
 * Responsible for comparing performance between different swarm configurations
 */

import {
  IComparisonEngine,
  SwarmMetrics,
  ComparisonResult,
  BenchmarkResult,
  PerformanceRanking,
  SwarmComparison,
  MetricComparison,
  ComparisonMatrix,
  ComparisonRecommendation,
  SwarmRanking,
  RankingCriteria,
  MetricType,
  PerformanceReportingError,
  ErrorCode
} from './interfaces.js';

export class ComparisonEngine implements IComparisonEngine {
  private readonly SIGNIFICANCE_THRESHOLD = 0.05; // p-value threshold for statistical significance
  private readonly MIN_SAMPLES = 10; // Minimum samples required for comparison
  
  async compare(swarms: SwarmMetrics[]): Promise<ComparisonResult> {
    try {
      if (swarms.length < 2) {
        throw new Error('At least 2 swarms are required for comparison');
      }

      // Validate swarm data
      this.validateSwarmData(swarms);

      // Perform pairwise comparisons
      const swarmComparisons = await this.performSwarmComparisons(swarms);
      
      // Create comparison matrix
      const comparisonMatrix = this.createComparisonMatrix(swarms, swarmComparisons);
      
      // Determine overall winner
      const overallWinner = this.determineOverallWinner(swarmComparisons);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(swarmComparisons);

      const result: ComparisonResult = {
        id: this.generateComparisonId(),
        timestamp: Date.now(),
        swarms: swarmComparisons,
        overallWinner,
        comparisonMatrix,
        recommendations
      };

      console.log(`🔄 Comparison completed for ${swarms.length} swarms`);
      return result;

    } catch (error) {
      throw new PerformanceReportingError(
        `Swarm comparison failed: ${error.message}`,
        ErrorCode.COMPARISON_FAILED,
        'ComparisonEngine',
        { swarmCount: swarms.length, error: error.message }
      );
    }
  }

  async benchmark(baseline: SwarmMetrics, candidates: SwarmMetrics[]): Promise<BenchmarkResult> {
    try {
      // Add baseline to comparison set
      const allSwarms = [baseline, ...candidates];
      
      // Perform standard comparison
      const comparisonResult = await this.compare(allSwarms);
      
      // Calculate improvements and regressions relative to baseline
      const improvements: Record<string, number> = {};
      const regressions: Record<string, number> = {};
      
      const baselineComparison = comparisonResult.swarms.find(s => s.swarmId === baseline.swarmId);
      if (!baselineComparison) {
        throw new Error('Baseline swarm not found in comparison results');
      }

      for (const swarmComparison of comparisonResult.swarms) {
        if (swarmComparison.swarmId === baseline.swarmId) continue;
        
        const performanceDelta = this.calculatePerformanceDelta(baselineComparison, swarmComparison);
        
        if (performanceDelta > 0) {
          improvements[swarmComparison.swarmId] = performanceDelta;
        } else {
          regressions[swarmComparison.swarmId] = Math.abs(performanceDelta);
        }
      }

      const benchmarkResult: BenchmarkResult = {
        ...comparisonResult,
        baseline: baseline.swarmId,
        improvements,
        regressions
      };

      console.log(`📊 Benchmark completed against baseline ${baseline.swarmId}`);
      return benchmarkResult;

    } catch (error) {
      throw new PerformanceReportingError(
        `Benchmarking failed: ${error.message}`,
        ErrorCode.COMPARISON_FAILED,
        'ComparisonEngine',
        { baseline: baseline.swarmId, candidates: candidates.length, error: error.message }
      );
    }
  }

  async rankPerformance(swarms: SwarmMetrics[], criteria: RankingCriteria[]): Promise<PerformanceRanking> {
    try {
      if (criteria.length === 0) {
        criteria = this.getDefaultRankingCriteria();
      }

      // Validate criteria weights sum to 1
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        throw new Error('Ranking criteria weights must sum to 1.0');
      }

      const rankings: SwarmRanking[] = [];

      for (const swarm of swarms) {
        const metricScores: Record<MetricType, number> = {} as any;
        const metricRanks: Record<MetricType, number> = {} as any;
        let overallScore = 0;

        // Calculate scores for each metric
        for (const criterion of criteria) {
          const metricData = this.extractMetricFromSwarm(swarm, criterion.metricType);
          if (!metricData) continue;

          // Normalize the metric value
          const normalizedScore = this.normalizeMetricValue(
            metricData.value,
            metricData.values,
            criterion.normalization,
            criterion.direction
          );

          metricScores[criterion.metricType] = normalizedScore;
          overallScore += normalizedScore * criterion.weight;
        }

        rankings.push({
          swarmId: swarm.swarmId,
          overallRank: 0, // Will be set after sorting
          overallScore,
          metricRanks,
          metricScores
        });
      }

      // Sort by overall score and assign ranks
      rankings.sort((a, b) => b.overallScore - a.overallScore);
      rankings.forEach((ranking, index) => {
        ranking.overallRank = index + 1;
      });

      // Calculate metric-specific ranks
      for (const criterion of criteria) {
        const metricRankings = rankings
          .filter(r => r.metricScores[criterion.metricType] !== undefined)
          .sort((a, b) => b.metricScores[criterion.metricType] - a.metricScores[criterion.metricType]);

        metricRankings.forEach((ranking, index) => {
          ranking.metricRanks[criterion.metricType] = index + 1;
        });
      }

      const result: PerformanceRanking = {
        rankings,
        criteria,
        methodology: 'Weighted scoring with normalization'
      };

      console.log(`🏆 Performance ranking completed for ${swarms.length} swarms`);
      return result;

    } catch (error) {
      throw new PerformanceReportingError(
        `Performance ranking failed: ${error.message}`,
        ErrorCode.COMPARISON_FAILED,
        'ComparisonEngine',
        { swarmCount: swarms.length, error: error.message }
      );
    }
  }

  async generateRecommendations(comparison: ComparisonResult): Promise<ComparisonRecommendation[]> {
    return this.generateComparisonRecommendations(comparison.swarms);
  }

  // Private helper methods

  private validateSwarmData(swarms: SwarmMetrics[]): void {
    for (const swarm of swarms) {
      if (!swarm.swarmId || !swarm.metrics || swarm.metrics.length === 0) {
        throw new Error(`Invalid swarm data for ${swarm.swarmId}`);
      }
      
      if (swarm.metrics.length < this.MIN_SAMPLES) {
        console.warn(`Swarm ${swarm.swarmId} has only ${swarm.metrics.length} samples (minimum ${this.MIN_SAMPLES} recommended)`);
      }
    }
  }

  private async performSwarmComparisons(swarms: SwarmMetrics[]): Promise<SwarmComparison[]> {
    const comparisons: SwarmComparison[] = [];
    
    // Calculate scores for each swarm
    const swarmScores = swarms.map(swarm => ({
      swarmId: swarm.swarmId,
      score: this.calculateOverallScore(swarm),
      metricComparisons: this.calculateMetricComparisons(swarm, swarms)
    }));

    // Sort by score and assign ranks
    swarmScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < swarmScores.length; i++) {
      const swarmScore = swarmScores[i];
      const swarm = swarms.find(s => s.swarmId === swarmScore.swarmId)!;
      
      const strengths = this.identifyStrengths(swarm, swarms);
      const weaknesses = this.identifyWeaknesses(swarm, swarms);

      comparisons.push({
        swarmId: swarmScore.swarmId,
        rank: i + 1,
        score: swarmScore.score,
        strengths,
        weaknesses,
        metricComparisons: swarmScore.metricComparisons
      });
    }

    return comparisons;
  }

  private calculateOverallScore(swarm: SwarmMetrics): number {
    let score = 0;
    let weightSum = 0;

    // Define metric weights (could be configurable)
    const weights = {
      [MetricType.TASK_DURATION]: 0.3,
      [MetricType.ERROR_RATE]: 0.25,
      [MetricType.MEMORY_USAGE]: 0.2,
      [MetricType.THROUGHPUT]: 0.15,
      [MetricType.CPU_USAGE]: 0.1
    };

    for (const [metricType, weight] of Object.entries(weights)) {
      const metricValue = this.getAverageMetricValue(swarm, metricType as MetricType);
      if (metricValue !== null) {
        // Normalize and invert where lower is better
        const normalizedScore = this.normalizeForScoring(metricType as MetricType, metricValue);
        score += normalizedScore * weight;
        weightSum += weight;
      }
    }

    return weightSum > 0 ? score / weightSum : 0;
  }

  private calculateMetricComparisons(targetSwarm: SwarmMetrics, allSwarms: SwarmMetrics[]): MetricComparison[] {
    const comparisons: MetricComparison[] = [];
    const metricTypes = this.getAllMetricTypes(allSwarms);

    for (const metricType of metricTypes) {
      const values: Record<string, number> = {};
      const validSwarms: string[] = [];

      for (const swarm of allSwarms) {
        const value = this.getAverageMetricValue(swarm, metricType);
        if (value !== null) {
          values[swarm.swarmId] = value;
          validSwarms.push(swarm.swarmId);
        }
      }

      if (validSwarms.length < 2) continue;

      // Find best and worst performers
      const sortedValues = validSwarms.sort((a, b) => {
        const valueA = values[a];
        const valueB = values[b];
        // For most metrics, lower is better
        return this.isHigherBetter(metricType) ? valueB - valueA : valueA - valueB;
      });

      const bestSwarm = sortedValues[0];
      const worstSwarm = sortedValues[sortedValues.length - 1];
      const bestValue = values[bestSwarm];
      const worstValue = values[worstSwarm];

      const percentageDifference = worstValue !== 0 ? 
        Math.abs((worstValue - bestValue) / worstValue) * 100 : 0;

      // Statistical significance (simplified t-test approximation)
      const significance = this.calculateStatisticalSignificance(targetSwarm, allSwarms, metricType);

      comparisons.push({
        metricType,
        values,
        bestSwarm,
        worstSwarm,
        percentageDifference,
        statisticalSignificance: significance
      });
    }

    return comparisons;
  }

  private createComparisonMatrix(swarms: SwarmMetrics[], comparisons: SwarmComparison[]): ComparisonMatrix {
    const metricTypes = this.getAllMetricTypes(swarms);
    const swarmIds = swarms.map(s => s.swarmId);
    
    // Create matrix of normalized scores
    const matrix: number[][] = [];
    const weights: Record<MetricType, number> = {} as any;

    // Default weights
    metricTypes.forEach(metricType => {
      weights[metricType] = 1 / metricTypes.length;
    });

    for (let i = 0; i < swarmIds.length; i++) {
      const row: number[] = [];
      const comparison = comparisons.find(c => c.swarmId === swarmIds[i]);
      
      for (const metricType of metricTypes) {
        const metricComparison = comparison?.metricComparisons.find(mc => mc.metricType === metricType);
        const value = metricComparison?.values[swarmIds[i]] || 0;
        row.push(value);
      }
      
      matrix.push(row);
    }

    return {
      metrics: metricTypes,
      swarms: swarmIds,
      matrix,
      weights
    };
  }

  private determineOverallWinner(comparisons: SwarmComparison[]): string | undefined {
    if (comparisons.length === 0) return undefined;
    
    // Winner is the top-ranked swarm
    return comparisons.find(c => c.rank === 1)?.swarmId;
  }

  private async generateComparisonRecommendations(comparisons: SwarmComparison[]): Promise<ComparisonRecommendation[]> {
    const recommendations: ComparisonRecommendation[] = [];
    
    // Analyze each swarm's weaknesses and suggest improvements
    for (const comparison of comparisons) {
      if (comparison.rank === 1) continue; // Skip winner
      
      const topWeaknesses = comparison.weaknesses.slice(0, 2);
      
      for (const weakness of topWeaknesses) {
        recommendations.push({
          title: `Improve ${weakness} for ${comparison.swarmId}`,
          description: `${comparison.swarmId} ranks #${comparison.rank} and shows poor performance in ${weakness}`,
          targetSwarm: comparison.swarmId,
          expectedImprovement: this.estimateImprovementPotential(comparison, weakness),
          effort: this.estimateEffortLevel(weakness),
          priority: comparison.rank > comparisons.length / 2 ? 'high' : 'medium'
        });
      }
    }

    return recommendations.slice(0, 10); // Limit recommendations
  }

  private identifyStrengths(swarm: SwarmMetrics, allSwarms: SwarmMetrics[]): string[] {
    const strengths: string[] = [];
    const metricTypes = this.getAllMetricTypes(allSwarms);

    for (const metricType of metricTypes) {
      const swarmValue = this.getAverageMetricValue(swarm, metricType);
      if (swarmValue === null) continue;

      const allValues = allSwarms
        .map(s => this.getAverageMetricValue(s, metricType))
        .filter(v => v !== null) as number[];

      if (allValues.length < 2) continue;

      const percentile = this.calculatePercentile(allValues, swarmValue);
      const isTopPerformer = this.isHigherBetter(metricType) ? 
        percentile >= 0.8 : percentile <= 0.2;

      if (isTopPerformer) {
        strengths.push(this.formatMetricName(metricType));
      }
    }

    return strengths;
  }

  private identifyWeaknesses(swarm: SwarmMetrics, allSwarms: SwarmMetrics[]): string[] {
    const weaknesses: string[] = [];
    const metricTypes = this.getAllMetricTypes(allSwarms);

    for (const metricType of metricTypes) {
      const swarmValue = this.getAverageMetricValue(swarm, metricType);
      if (swarmValue === null) continue;

      const allValues = allSwarms
        .map(s => this.getAverageMetricValue(s, metricType))
        .filter(v => v !== null) as number[];

      if (allValues.length < 2) continue;

      const percentile = this.calculatePercentile(allValues, swarmValue);
      const isBottomPerformer = this.isHigherBetter(metricType) ? 
        percentile <= 0.2 : percentile >= 0.8;

      if (isBottomPerformer) {
        weaknesses.push(this.formatMetricName(metricType));
      }
    }

    return weaknesses;
  }

  private getAverageMetricValue(swarm: SwarmMetrics, metricType: MetricType): number | null {
    const relevantMetrics = swarm.metrics.filter(m => m.metricType === metricType);
    if (relevantMetrics.length === 0) return null;

    const values = relevantMetrics
      .map(m => Number(m.value))
      .filter(v => !isNaN(v));

    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }

  private getAllMetricTypes(swarms: SwarmMetrics[]): MetricType[] {
    const types = new Set<MetricType>();
    
    for (const swarm of swarms) {
      for (const metric of swarm.metrics) {
        types.add(metric.metricType);
      }
    }
    
    return Array.from(types);
  }

  private isHigherBetter(metricType: MetricType): boolean {
    // Define which metrics are better when higher
    const higherIsBetter = [
      MetricType.THROUGHPUT,
      MetricType.CONCURRENT_AGENTS
    ];
    
    return higherIsBetter.includes(metricType);
  }

  private normalizeForScoring(metricType: MetricType, value: number): number {
    // Simple normalization - in practice, this would use historical data
    // to establish reasonable bounds
    const bounds = this.getMetricBounds(metricType);
    
    let normalized = (value - bounds.min) / (bounds.max - bounds.min);
    normalized = Math.max(0, Math.min(1, normalized));
    
    // Invert for metrics where lower is better
    if (!this.isHigherBetter(metricType)) {
      normalized = 1 - normalized;
    }
    
    return normalized;
  }

  private getMetricBounds(metricType: MetricType) {
    // Default bounds - should be configurable or learned from data
    const bounds = {
      [MetricType.TASK_DURATION]: { min: 0, max: 5000 },
      [MetricType.ERROR_RATE]: { min: 0, max: 0.2 },
      [MetricType.MEMORY_USAGE]: { min: 0, max: 1 },
      [MetricType.CPU_USAGE]: { min: 0, max: 1 },
      [MetricType.THROUGHPUT]: { min: 0, max: 1000 },
      [MetricType.NETWORK_LATENCY]: { min: 0, max: 1000 },
      [MetricType.TOKEN_USAGE]: { min: 0, max: 10000 }
    };
    
    return bounds[metricType] || { min: 0, max: 100 };
  }

  private calculatePercentile(values: number[], targetValue: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= targetValue);
    return index === -1 ? 1 : index / sorted.length;
  }

  private calculateStatisticalSignificance(
    targetSwarm: SwarmMetrics,
    allSwarms: SwarmMetrics[],
    metricType: MetricType
  ): number {
    // Simplified statistical significance calculation
    // In practice, this would use proper statistical tests
    const sampleSizes = allSwarms.map(swarm => 
      swarm.metrics.filter(m => m.metricType === metricType).length
    );
    
    const minSampleSize = Math.min(...sampleSizes);
    
    if (minSampleSize < 10) return 0.9; // Low significance for small samples
    if (minSampleSize < 30) return 0.1;
    return 0.05; // Assume good significance for larger samples
  }

  private calculatePerformanceDelta(baseline: SwarmComparison, candidate: SwarmComparison): number {
    // Simple delta calculation based on overall score
    return candidate.score - baseline.score;
  }

  private extractMetricFromSwarm(swarm: SwarmMetrics, metricType: MetricType) {
    const relevantMetrics = swarm.metrics.filter(m => m.metricType === metricType);
    if (relevantMetrics.length === 0) return null;

    const values = relevantMetrics.map(m => Number(m.value)).filter(v => !isNaN(v));
    const value = values.reduce((sum, v) => sum + v, 0) / values.length;

    return { value, values };
  }

  private normalizeMetricValue(
    value: number,
    allValues: number[],
    normalization: 'min_max' | 'z_score' | 'percentile',
    direction: 'higher_better' | 'lower_better'
  ): number {
    let normalized: number;

    switch (normalization) {
      case 'min_max':
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        normalized = max === min ? 0.5 : (value - min) / (max - min);
        break;
      case 'z_score':
        const mean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
        const stdDev = Math.sqrt(allValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allValues.length);
        normalized = stdDev === 0 ? 0.5 : Math.max(0, Math.min(1, (value - mean) / (3 * stdDev) + 0.5));
        break;
      case 'percentile':
        const sorted = [...allValues].sort((a, b) => a - b);
        const index = sorted.findIndex(v => v >= value);
        normalized = index === -1 ? 1 : index / sorted.length;
        break;
      default:
        normalized = 0.5;
    }

    return direction === 'lower_better' ? 1 - normalized : normalized;
  }

  private getDefaultRankingCriteria(): RankingCriteria[] {
    return [
      {
        metricType: MetricType.TASK_DURATION,
        weight: 0.3,
        direction: 'lower_better',
        normalization: 'min_max'
      },
      {
        metricType: MetricType.ERROR_RATE,
        weight: 0.25,
        direction: 'lower_better',
        normalization: 'min_max'
      },
      {
        metricType: MetricType.MEMORY_USAGE,
        weight: 0.2,
        direction: 'lower_better',
        normalization: 'min_max'
      },
      {
        metricType: MetricType.THROUGHPUT,
        weight: 0.15,
        direction: 'higher_better',
        normalization: 'min_max'
      },
      {
        metricType: MetricType.CPU_USAGE,
        weight: 0.1,
        direction: 'lower_better',
        normalization: 'min_max'
      }
    ];
  }

  private formatMetricName(metricType: MetricType): string {
    return metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private estimateImprovementPotential(comparison: SwarmComparison, weakness: string): number {
    // Estimate improvement based on rank and current score
    const maxImprovement = (comparison.rank - 1) * 0.1;
    return Math.min(0.5, maxImprovement);
  }

  private estimateEffortLevel(weakness: string): 'low' | 'medium' | 'high' {
    // Simple heuristic based on weakness type
    const lowEffortMetrics = ['CPU Usage', 'Memory Usage'];
    const highEffortMetrics = ['Task Duration', 'Error Rate'];
    
    if (lowEffortMetrics.includes(weakness)) return 'low';
    if (highEffortMetrics.includes(weakness)) return 'high';
    return 'medium';
  }

  private generateComparisonId(): string {
    return `comparison_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}