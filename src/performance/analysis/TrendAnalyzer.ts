/**
 * Performance Trend Analysis Engine
 * Analyzes time series data to identify trends, seasonality, and generate forecasts
 */

import {
  TimeSeriesData,
  TimeSeriesAnalysis,
  TrendAnalysis,
  ForecastResult,
  ITrendAnalyzer,
  TrendDirection,
  TrendComponent,
  SeasonalComponent,
  ResidualComponent,
  ChangePoint,
  Prediction,
  SeasonalityPattern,
  ConfidenceInterval,
  ForecastAccuracy,
  MetricType
} from '../types';

export class TrendAnalyzer implements ITrendAnalyzer {
  private readonly TREND_CONFIDENCE_THRESHOLD = 0.7;
  private readonly SEASONAL_SIGNIFICANCE_THRESHOLD = 0.1;
  private readonly CHANGE_POINT_THRESHOLD = 2.0; // Standard deviations

  /**
   * Analyze complete time series data
   */
  analyzeTimeSeries(data: TimeSeriesData): TimeSeriesAnalysis {
    if (data.values.length < 3) {
      throw new Error('Insufficient data points for time series analysis');
    }

    // Decompose the time series
    const trend = this.analyzeTrendComponent(data);
    const seasonal = this.analyzeSeasonalComponent(data, trend);
    const residual = this.analyzeResidualComponent(data, trend, seasonal);
    const forecast = this.generateForecast(data, 24); // 24-hour forecast

    return {
      data,
      trend,
      seasonal,
      residual,
      forecast
    };
  }

  /**
   * Detect trends in time series data
   */
  detectTrends(data: TimeSeriesData): TrendAnalysis {
    const analysis = this.analyzeTimeSeries(data);
    const trendStrength = this.calculateTrendStrength(analysis.trend);
    const predictions = this.generateTrendPredictions(data, 12);
    const seasonality = analysis.seasonal.detected ? analysis.seasonal.patterns : undefined;

    return {
      metricType: MetricType.CUSTOM, // Will be set by caller
      trend: analysis.trend.direction,
      confidence: trendStrength,
      changeRate: this.calculateChangeRate(data),
      predictions,
      seasonality: seasonality?.[0] // Primary seasonal pattern
    };
  }

  /**
   * Generate forecast for time series data
   */
  generateForecast(data: TimeSeriesData, horizon: number): ForecastResult {
    if (data.values.length < 5) {
      throw new Error('Insufficient data for forecasting');
    }

    // Use simple exponential smoothing with trend
    const alpha = 0.3; // Smoothing parameter
    const beta = 0.2;  // Trend parameter

    const forecast = this.exponentialSmoothingWithTrend(data, horizon, alpha, beta);
    const accuracy = this.calculateForecastAccuracy(data, forecast);

    return {
      timestamps: forecast.timestamps,
      values: forecast.values,
      confidenceIntervals: this.calculateConfidenceIntervals(forecast),
      accuracy
    };
  }

  /**
   * Detect anomalies in time series
   */
  public detectAnomalies(data: TimeSeriesData, sensitivity: number = 2.0): {
    anomalies: Array<{ timestamp: number; value: number; score: number }>;
    threshold: number;
  } {
    const analysis = this.analyzeTimeSeries(data);
    const residuals = analysis.residual.values;
    const threshold = sensitivity * Math.sqrt(analysis.residual.variance);
    
    const anomalies: Array<{ timestamp: number; value: number; score: number }> = [];

    for (let i = 0; i < residuals.length; i++) {
      const score = Math.abs(residuals[i]);
      if (score > threshold) {
        anomalies.push({
          timestamp: data.timestamps[i],
          value: data.values[i],
          score
        });
      }
    }

    return { anomalies, threshold };
  }

  /**
   * Analyze trend component
   */
  private analyzeTrendComponent(data: TimeSeriesData): TrendComponent {
    const values = data.values;
    const n = values.length;

    // Calculate linear trend using least squares
    const { slope, intercept } = this.calculateLinearTrend(data);
    
    // Determine trend direction
    let direction: TrendDirection;
    const slopeThreshold = Math.abs(slope) / Math.max(...values) * 100; // Percentage change

    if (slopeThreshold < 0.1) {
      direction = TrendDirection.STABLE;
    } else if (slope > 0) {
      direction = TrendDirection.INCREASING;
    } else {
      direction = TrendDirection.DECREASING;
    }

    // Check for volatility
    const volatility = this.calculateVolatility(values);
    if (volatility > 0.2) { // 20% threshold
      direction = TrendDirection.VOLATILE;
    }

    // Calculate trend strength
    const strength = Math.min(Math.abs(slope) * Math.sqrt(n) / Math.max(...values), 1.0);

    // Detect change points
    const changePoints = this.detectChangePoints(data);

    return {
      direction,
      strength,
      changePoints
    };
  }

  /**
   * Analyze seasonal component
   */
  private analyzeSeasonalComponent(
    data: TimeSeriesData, 
    trend: TrendComponent
  ): SeasonalComponent {
    if (data.values.length < 24) { // Need at least 24 points to detect daily seasonality
      return { detected: false };
    }

    // Test common seasonal periods
    const testPeriods = [24, 168, 720, 8760]; // Hours: day, week, month, year
    const patterns: SeasonalityPattern[] = [];

    for (const period of testPeriods) {
      if (data.values.length >= period * 2) {
        const pattern = this.testSeasonality(data, period);
        if (pattern.confidence > this.SEASONAL_SIGNIFICANCE_THRESHOLD) {
          patterns.push(pattern);
        }
      }
    }

    const detected = patterns.length > 0;
    const primaryPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];

    return {
      detected,
      period: primaryPattern?.period,
      strength: primaryPattern?.amplitude,
      patterns: detected ? patterns : undefined
    };
  }

  /**
   * Analyze residual component
   */
  private analyzeResidualComponent(
    data: TimeSeriesData,
    trend: TrendComponent,
    seasonal: SeasonalComponent
  ): ResidualComponent {
    const residuals = this.calculateResiduals(data, trend, seasonal);
    const variance = this.calculateVariance(residuals);
    const autocorrelation = this.calculateAutocorrelation(residuals, 1);

    return {
      values: residuals,
      variance,
      autocorrelation
    };
  }

  /**
   * Calculate linear trend
   */
  private calculateLinearTrend(data: TimeSeriesData): { slope: number; intercept: number } {
    const n = data.values.length;
    const x = data.timestamps.map((_, i) => i); // Use indices for simplicity
    const y = data.values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Detect change points in time series
   */
  private detectChangePoints(data: TimeSeriesData): ChangePoint[] {
    const changePoints: ChangePoint[] = [];
    const windowSize = Math.max(5, Math.floor(data.values.length / 10));
    
    for (let i = windowSize; i < data.values.length - windowSize; i++) {
      const beforeWindow = data.values.slice(i - windowSize, i);
      const afterWindow = data.values.slice(i, i + windowSize);
      
      const beforeMean = beforeWindow.reduce((sum, val) => sum + val, 0) / beforeWindow.length;
      const afterMean = afterWindow.reduce((sum, val) => sum + val, 0) / afterWindow.length;
      
      const beforeVar = this.calculateVariance(beforeWindow);
      const afterVar = this.calculateVariance(afterWindow);
      const pooledStd = Math.sqrt((beforeVar + afterVar) / 2);
      
      if (pooledStd > 0) {
        const significance = Math.abs(afterMean - beforeMean) / pooledStd;
        
        if (significance > this.CHANGE_POINT_THRESHOLD) {
          changePoints.push({
            timestamp: data.timestamps[i],
            previousValue: beforeMean,
            newValue: afterMean,
            significance
          });
        }
      }
    }

    return changePoints;
  }

  /**
   * Test for seasonality
   */
  private testSeasonality(data: TimeSeriesData, period: number): SeasonalityPattern {
    const n = data.values.length;
    const cycles = Math.floor(n / period);
    
    if (cycles < 2) {
      return { period, amplitude: 0, phase: 0, confidence: 0 };
    }

    // Extract complete cycles
    const cycleData: number[][] = [];
    for (let c = 0; c < cycles; c++) {
      const cycle = data.values.slice(c * period, (c + 1) * period);
      cycleData.push(cycle);
    }

    // Calculate average seasonal pattern
    const seasonalPattern = new Array(period).fill(0);
    for (let i = 0; i < period; i++) {
      let sum = 0;
      let count = 0;
      for (let c = 0; c < cycles; c++) {
        if (i < cycleData[c].length) {
          sum += cycleData[c][i];
          count++;
        }
      }
      seasonalPattern[i] = count > 0 ? sum / count : 0;
    }

    // Calculate amplitude and confidence
    const meanValue = seasonalPattern.reduce((sum, val) => sum + val, 0) / period;
    const amplitude = Math.max(...seasonalPattern) - Math.min(...seasonalPattern);
    
    // Calculate confidence based on consistency across cycles
    let totalVariance = 0;
    let seasonalVariance = 0;
    
    for (let i = 0; i < period; i++) {
      let variance = 0;
      for (let c = 0; c < cycles; c++) {
        if (i < cycleData[c].length) {
          variance += Math.pow(cycleData[c][i] - seasonalPattern[i], 2);
        }
      }
      totalVariance += variance;
      seasonalVariance += Math.pow(seasonalPattern[i] - meanValue, 2);
    }

    const confidence = seasonalVariance > 0 ? 
      Math.min(seasonalVariance / (totalVariance + seasonalVariance), 1.0) : 0;

    return {
      period,
      amplitude,
      phase: this.calculatePhase(seasonalPattern),
      confidence
    };
  }

  /**
   * Calculate phase of seasonal pattern
   */
  private calculatePhase(pattern: number[]): number {
    const maxIndex = pattern.indexOf(Math.max(...pattern));
    return (2 * Math.PI * maxIndex) / pattern.length;
  }

  /**
   * Calculate residuals
   */
  private calculateResiduals(
    data: TimeSeriesData,
    trend: TrendComponent,
    seasonal: SeasonalComponent
  ): number[] {
    const residuals: number[] = [];
    const { slope, intercept } = this.calculateLinearTrend(data);

    for (let i = 0; i < data.values.length; i++) {
      let expected = intercept + slope * i; // Linear trend
      
      // Add seasonal component if present
      if (seasonal.detected && seasonal.period) {
        const seasonalIndex = i % seasonal.period;
        // Simplified seasonal adjustment
        expected += (seasonal.strength || 0) * Math.sin(2 * Math.PI * seasonalIndex / seasonal.period);
      }

      residuals.push(data.values[i] - expected);
    }

    return residuals;
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Exponential smoothing with trend
   */
  private exponentialSmoothingWithTrend(
    data: TimeSeriesData,
    horizon: number,
    alpha: number,
    beta: number
  ): { timestamps: number[]; values: number[] } {
    const values = data.values;
    const n = values.length;
    
    // Initialize
    let level = values[0];
    let trend = values.length > 1 ? values[1] - values[0] : 0;
    
    // Fit the model
    for (let i = 1; i < n; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    // Generate forecast
    const forecastValues: number[] = [];
    const forecastTimestamps: number[] = [];
    const timeStep = data.timestamps.length > 1 ? 
      data.timestamps[1] - data.timestamps[0] : 3600000; // 1 hour default

    for (let h = 1; h <= horizon; h++) {
      forecastValues.push(level + h * trend);
      forecastTimestamps.push(data.timestamps[n - 1] + h * timeStep);
    }

    return {
      timestamps: forecastTimestamps,
      values: forecastValues
    };
  }

  /**
   * Calculate forecast accuracy
   */
  private calculateForecastAccuracy(
    actual: TimeSeriesData,
    forecast: { timestamps: number[]; values: number[] }
  ): ForecastAccuracy {
    // Use last portion of actual data to validate forecast accuracy
    const validationSize = Math.min(forecast.values.length, actual.values.length);
    const actualValidation = actual.values.slice(-validationSize);
    const forecastValidation = forecast.values.slice(0, validationSize);

    if (actualValidation.length === 0) {
      return { mae: 0, mse: 0, mape: 0, r2: 0 };
    }

    let mae = 0;
    let mse = 0;
    let mape = 0;

    for (let i = 0; i < actualValidation.length; i++) {
      const error = Math.abs(actualValidation[i] - forecastValidation[i]);
      mae += error;
      mse += error * error;
      
      if (actualValidation[i] !== 0) {
        mape += Math.abs(error / actualValidation[i]);
      }
    }

    mae /= actualValidation.length;
    mse /= actualValidation.length;
    mape = (mape / actualValidation.length) * 100;

    // Calculate R-squared
    const actualMean = actualValidation.reduce((sum, val) => sum + val, 0) / actualValidation.length;
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (let i = 0; i < actualValidation.length; i++) {
      totalSumSquares += Math.pow(actualValidation[i] - actualMean, 2);
      residualSumSquares += Math.pow(actualValidation[i] - forecastValidation[i], 2);
    }

    const r2 = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { mae, mse, mape, r2 };
  }

  /**
   * Calculate confidence intervals for forecast
   */
  private calculateConfidenceIntervals(
    forecast: { timestamps: number[]; values: number[] }
  ): ConfidenceInterval[] {
    const confidence = 0.95;
    const zScore = 1.96; // 95% confidence interval
    
    return forecast.timestamps.map((timestamp, i) => {
      const value = forecast.values[i];
      const margin = zScore * Math.sqrt(value * 0.1); // Simplified error estimation
      
      return {
        timestamp,
        lower: value - margin,
        upper: value + margin,
        confidence
      };
    });
  }

  /**
   * Helper methods
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateTrendStrength(trend: TrendComponent): number {
    return Math.min(trend.strength, 1.0);
  }

  private calculateChangeRate(data: TimeSeriesData): number {
    if (data.values.length < 2) return 0;
    
    const first = data.values[0];
    const last = data.values[data.values.length - 1];
    
    if (first === 0) return 0;
    
    const timeSpan = data.timestamps[data.timestamps.length - 1] - data.timestamps[0];
    const ratePerMs = (last - first) / first / timeSpan;
    
    return ratePerMs * 3600000; // Convert to rate per hour
  }

  private generateTrendPredictions(data: TimeSeriesData, count: number): Prediction[] {
    const forecast = this.generateForecast(data, count);
    
    return forecast.timestamps.map((timestamp, i) => ({
      timestamp,
      value: forecast.values[i],
      confidence: Math.max(0.1, 0.9 - i * 0.05) // Decreasing confidence over time
    }));
  }
}