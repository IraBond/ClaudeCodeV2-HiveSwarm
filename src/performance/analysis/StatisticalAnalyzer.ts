/**
 * Statistical Analysis Engine
 * Provides comprehensive statistical analysis of performance data
 */

import {
  StatisticalSummary,
  OutlierAnalysis,
  Correlation,
  IStatisticalAnalyzer,
  OutlierDetectionMethod,
  CorrelationStrength,
  Percentiles
} from '../types';

export class StatisticalAnalyzer implements IStatisticalAnalyzer {
  private readonly DEFAULT_OUTLIER_THRESHOLD = 2.5; // Z-score threshold
  private readonly CORRELATION_THRESHOLDS = {
    [CorrelationStrength.NONE]: 0.1,
    [CorrelationStrength.WEAK]: 0.3,
    [CorrelationStrength.MODERATE]: 0.5,
    [CorrelationStrength.STRONG]: 0.7,
    [CorrelationStrength.VERY_STRONG]: 0.9
  };

  /**
   * Calculate comprehensive statistical summary
   */
  calculateSummary(values: number[]): StatisticalSummary {
    if (values.length === 0) {
      return this.createEmptySummary();
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const mean = this.calculateMean(values);
    const variance = this.calculateVariance(values, mean);
    const standardDeviation = Math.sqrt(variance);

    return {
      count: values.length,
      mean,
      median: this.calculateMedian(sortedValues),
      mode: this.calculateMode(values),
      standardDeviation,
      variance,
      min: sortedValues[0],
      max: sortedValues[sortedValues.length - 1],
      percentiles: this.calculatePercentiles(sortedValues),
      outliers: this.detectOutliers(values, OutlierDetectionMethod.Z_SCORE)
    };
  }

  /**
   * Detect outliers using various methods
   */
  detectOutliers(
    values: number[], 
    method: OutlierDetectionMethod = OutlierDetectionMethod.Z_SCORE
  ): OutlierAnalysis {
    switch (method) {
      case OutlierDetectionMethod.Z_SCORE:
        return this.detectOutliersZScore(values);
      case OutlierDetectionMethod.IQR:
        return this.detectOutliersIQR(values);
      case OutlierDetectionMethod.ISOLATION_FOREST:
        return this.detectOutliersIsolationForest(values);
      case OutlierDetectionMethod.LOCAL_OUTLIER_FACTOR:
        return this.detectOutliersLOF(values);
      default:
        return this.detectOutliersZScore(values);
    }
  }

  /**
   * Calculate correlations between multiple datasets
   */
  calculateCorrelations(datasets: Record<string, number[]>): Correlation[] {
    const correlations: Correlation[] = [];
    const keys = Object.keys(datasets);

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const metric1 = keys[i];
        const metric2 = keys[j];
        const values1 = datasets[metric1];
        const values2 = datasets[metric2];

        if (values1.length === values2.length && values1.length > 1) {
          const coefficient = this.calculatePearsonCorrelation(values1, values2);
          const strength = this.determineCorrelationStrength(Math.abs(coefficient));
          const significance = this.calculateSignificance(coefficient, values1.length);

          correlations.push({
            metric1,
            metric2,
            coefficient,
            strength,
            significance
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }

  /**
   * Calculate advanced statistics
   */
  public calculateAdvancedStats(values: number[]): {
    skewness: number;
    kurtosis: number;
    entropy: number;
    coefficientOfVariation: number;
  } {
    if (values.length === 0) {
      return { skewness: 0, kurtosis: 0, entropy: 0, coefficientOfVariation: 0 };
    }

    const mean = this.calculateMean(values);
    const std = Math.sqrt(this.calculateVariance(values, mean));

    return {
      skewness: this.calculateSkewness(values, mean, std),
      kurtosis: this.calculateKurtosis(values, mean, std),
      entropy: this.calculateEntropy(values),
      coefficientOfVariation: std / mean
    };
  }

  /**
   * Perform hypothesis testing
   */
  public performTTest(sample1: number[], sample2: number[]): {
    tStatistic: number;
    pValue: number;
    significant: boolean;
    confidenceLevel: number;
  } {
    const mean1 = this.calculateMean(sample1);
    const mean2 = this.calculateMean(sample2);
    const var1 = this.calculateVariance(sample1, mean1);
    const var2 = this.calculateVariance(sample2, mean2);
    
    const pooledVar = ((sample1.length - 1) * var1 + (sample2.length - 1) * var2) / 
                     (sample1.length + sample2.length - 2);
    
    const standardError = Math.sqrt(pooledVar * (1/sample1.length + 1/sample2.length));
    const tStatistic = (mean1 - mean2) / standardError;
    const degreesOfFreedom = sample1.length + sample2.length - 2;
    
    // Simplified p-value calculation (normally would use t-distribution)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));
    
    return {
      tStatistic,
      pValue,
      significant: pValue < 0.05,
      confidenceLevel: 0.95
    };
  }

  /**
   * Calculate moving statistics
   */
  public calculateMovingStatistics(values: number[], windowSize: number): {
    movingAverage: number[];
    movingStd: number[];
    movingMin: number[];
    movingMax: number[];
  } {
    const movingAverage: number[] = [];
    const movingStd: number[] = [];
    const movingMin: number[] = [];
    const movingMax: number[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const mean = this.calculateMean(window);
      
      movingAverage.push(mean);
      movingStd.push(Math.sqrt(this.calculateVariance(window, mean)));
      movingMin.push(Math.min(...window));
      movingMax.push(Math.max(...window));
    }

    return { movingAverage, movingStd, movingMin, movingMax };
  }

  // Private helper methods

  private createEmptySummary(): StatisticalSummary {
    return {
      count: 0,
      mean: 0,
      median: 0,
      mode: [],
      standardDeviation: 0,
      variance: 0,
      min: 0,
      max: 0,
      percentiles: {
        p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0
      },
      outliers: {
        method: OutlierDetectionMethod.Z_SCORE,
        outliers: [],
        threshold: 0,
        count: 0
      }
    };
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  private calculateMode(values: number[]): number[] {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;

    for (const value of values) {
      frequency[value] = (frequency[value] || 0) + 1;
      maxFreq = Math.max(maxFreq, frequency[value]);
    }

    return Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number);
  }

  private calculateVariance(values: number[], mean?: number): number {
    const m = mean ?? this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
  }

  private calculatePercentiles(sortedValues: number[]): Percentiles {
    const getPercentile = (p: number): number => {
      const index = (p / 100) * (sortedValues.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;

      if (lower === upper) {
        return sortedValues[lower];
      }

      return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    };

    return {
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  private detectOutliersZScore(values: number[]): OutlierAnalysis {
    const mean = this.calculateMean(values);
    const std = Math.sqrt(this.calculateVariance(values, mean));
    const threshold = this.DEFAULT_OUTLIER_THRESHOLD;

    const outliers = values.filter(value => 
      Math.abs((value - mean) / std) > threshold
    );

    return {
      method: OutlierDetectionMethod.Z_SCORE,
      outliers,
      threshold,
      count: outliers.length
    };
  }

  private detectOutliersIQR(values: number[]): OutlierAnalysis {
    const sortedValues = [...values].sort((a, b) => a - b);
    const q1 = this.calculatePercentiles(sortedValues).p25;
    const q3 = this.calculatePercentiles(sortedValues).p75;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = values.filter(value => 
      value < lowerBound || value > upperBound
    );

    return {
      method: OutlierDetectionMethod.IQR,
      outliers,
      threshold: 1.5,
      count: outliers.length
    };
  }

  private detectOutliersIsolationForest(values: number[]): OutlierAnalysis {
    // Simplified isolation forest implementation
    // In production, use a proper machine learning library
    const mean = this.calculateMean(values);
    const std = Math.sqrt(this.calculateVariance(values, mean));
    const threshold = 2.0;

    const scores = values.map(value => Math.abs((value - mean) / std));
    const outliers = values.filter((_, index) => scores[index] > threshold);

    return {
      method: OutlierDetectionMethod.ISOLATION_FOREST,
      outliers,
      threshold,
      count: outliers.length
    };
  }

  private detectOutliersLOF(values: number[]): OutlierAnalysis {
    // Simplified Local Outlier Factor implementation
    // In production, use a proper machine learning library
    const threshold = 1.5;
    const outliers: number[] = [];

    // Simplified approach: find values far from local neighbors
    for (let i = 0; i < values.length; i++) {
      const neighbors = values
        .map((val, idx) => ({ value: val, distance: Math.abs(val - values[i]), index: idx }))
        .filter(n => n.index !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, Math.min(5, values.length - 1));

      if (neighbors.length > 0) {
        const avgDistance = neighbors.reduce((sum, n) => sum + n.distance, 0) / neighbors.length;
        if (avgDistance > threshold) {
          outliers.push(values[i]);
        }
      }
    }

    return {
      method: OutlierDetectionMethod.LOCAL_OUTLIER_FACTOR,
      outliers,
      threshold,
      count: outliers.length
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(y);

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private determineCorrelationStrength(absCoeff: number): CorrelationStrength {
    if (absCoeff >= this.CORRELATION_THRESHOLDS[CorrelationStrength.VERY_STRONG]) {
      return CorrelationStrength.VERY_STRONG;
    } else if (absCoeff >= this.CORRELATION_THRESHOLDS[CorrelationStrength.STRONG]) {
      return CorrelationStrength.STRONG;
    } else if (absCoeff >= this.CORRELATION_THRESHOLDS[CorrelationStrength.MODERATE]) {
      return CorrelationStrength.MODERATE;
    } else if (absCoeff >= this.CORRELATION_THRESHOLDS[CorrelationStrength.WEAK]) {
      return CorrelationStrength.WEAK;
    } else {
      return CorrelationStrength.NONE;
    }
  }

  private calculateSignificance(coefficient: number, n: number): number {
    // Simplified significance calculation
    const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));
    return 2 * (1 - this.normalCDF(Math.abs(t)));
  }

  private calculateSkewness(values: number[], mean: number, std: number): number {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private calculateKurtosis(values: number[], mean: number, std: number): number {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
           (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }

  private calculateEntropy(values: number[]): number {
    // Discretize values into bins for entropy calculation
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const counts = new Array(bins).fill(0);

    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      counts[binIndex]++;
    }

    const probabilities = counts.map(count => count / values.length);
    return probabilities.reduce((entropy, p) => {
      return p > 0 ? entropy - p * Math.log2(p) : entropy;
    }, 0);
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}