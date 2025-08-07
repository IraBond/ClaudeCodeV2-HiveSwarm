/**
 * Resource Utilization Analysis Engine
 * Analyzes resource usage patterns, efficiency, and identifies optimization opportunities
 */

import {
  ResourceUsage,
  ResourceMetric,
  ResourceAnalysis,
  EfficiencyMetrics,
  UtilizationPattern,
  WasteAnalysis,
  OptimizationOpportunity,
  WasteReason,
  PatternType,
  TimeRange,
  IResourceAnalyzer
} from '../types';

export class ResourceAnalyzer implements IResourceAnalyzer {
  private readonly EFFICIENCY_THRESHOLDS = {
    excellent: 0.9,
    good: 0.75,
    fair: 0.6,
    poor: 0.4
  };

  private readonly WASTE_THRESHOLDS = {
    low: 0.1,      // 10% waste
    moderate: 0.25, // 25% waste
    high: 0.5       // 50% waste
  };

  /**
   * Analyze resource utilization patterns
   */
  analyzeUtilization(resourceMetrics: ResourceMetric[], timeRange: TimeRange): ResourceAnalysis {
    if (resourceMetrics.length === 0) {
      throw new Error('No resource metrics provided for analysis');
    }

    const efficiency = this.calculateEfficiency(resourceMetrics);
    const utilization = this.analyzeUtilizationPatterns(resourceMetrics, timeRange);
    const waste = this.identifyWaste(resourceMetrics);
    const optimization = this.identifyOptimizationOpportunities(resourceMetrics, efficiency, waste);

    return {
      efficiency,
      utilization,
      waste,
      optimization
    };
  }

  /**
   * Calculate efficiency metrics for resources
   */
  calculateEfficiency(
    usage: ResourceUsage[], 
    baseline?: ResourceUsage
  ): EfficiencyMetrics {
    if (usage.length === 0) {
      return this.createEmptyEfficiencyMetrics();
    }

    // Calculate efficiency for each resource type
    const cpuEfficiency = this.calculateResourceEfficiency(
      usage.map(u => u.cpu),
      baseline?.cpu
    );

    const memoryEfficiency = this.calculateResourceEfficiency(
      usage.map(u => u.memory),
      baseline?.memory
    );

    const networkEfficiency = this.calculateResourceEfficiency(
      usage.map(u => u.network),
      baseline?.network
    );

    const storageEfficiency = this.calculateResourceEfficiency(
      usage.map(u => u.storage),
      baseline?.storage
    );

    // Calculate overall efficiency
    const overall = (cpuEfficiency + memoryEfficiency + networkEfficiency + storageEfficiency) / 4;

    return {
      overall,
      cpu: cpuEfficiency,
      memory: memoryEfficiency,
      network: networkEfficiency,
      storage: storageEfficiency
    };
  }

  /**
   * Identify resource waste
   */
  identifyWaste(usage: ResourceUsage[]): WasteAnalysis {
    if (usage.length === 0) {
      return { totalWaste: 0, wasteByResource: {}, wasteReasons: [] };
    }

    const wasteByResource: Record<string, number> = {};
    const wasteReasons: WasteReason[] = [];

    // Analyze each resource type
    const resourceTypes = ['cpu', 'memory', 'network', 'storage'] as const;
    
    for (const resourceType of resourceTypes) {
      const resourceMetrics = usage.map(u => u[resourceType]);
      const waste = this.calculateResourceWaste(resourceMetrics);
      wasteByResource[resourceType] = waste.percentage;

      // Add waste reasons
      waste.reasons.forEach(reason => {
        const existingReason = wasteReasons.find(r => r.reason === reason.reason);
        if (existingReason) {
          existingReason.impact += reason.impact;
          existingReason.frequency += reason.frequency;
        } else {
          wasteReasons.push(reason);
        }
      });
    }

    const totalWaste = Object.values(wasteByResource).reduce((sum, waste) => sum + waste, 0) / 4;

    return {
      totalWaste,
      wasteByResource,
      wasteReasons: wasteReasons.sort((a, b) => b.impact - a.impact)
    };
  }

  /**
   * Analyze utilization patterns
   */
  private analyzeUtilizationPatterns(
    resourceMetrics: ResourceMetric[],
    timeRange: TimeRange
  ): UtilizationPattern[] {
    const patterns: UtilizationPattern[] = [];
    const resourceTypes = ['cpu', 'memory', 'network', 'storage'] as const;

    for (const resourceType of resourceTypes) {
      const metrics = resourceMetrics.map(m => m);
      
      // Analyze each metric separately for now (in real implementation, would get proper resource-specific metrics)
      for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        const pattern = this.detectUtilizationPattern(metric);
        const peakHours = this.identifyPeakHours(metric, timeRange);
        
        patterns.push({
          resource: `${resourceType}_${i}`,
          pattern: pattern.type,
          peakHours,
          averageUtilization: metric.average,
          variance: this.calculateVariance(metric.values)
        });
      }
    }

    return patterns;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(
    resourceMetrics: ResourceMetric[],
    efficiency: EfficiencyMetrics,
    waste: WasteAnalysis
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // CPU optimization opportunities
    if (efficiency.cpu < this.EFFICIENCY_THRESHOLDS.good) {
      opportunities.push({
        area: 'CPU Optimization',
        potential: (this.EFFICIENCY_THRESHOLDS.good - efficiency.cpu) * 100,
        effort: this.calculateOptimizationEffort('cpu', efficiency.cpu),
        priority: this.calculateOptimizationPriority('cpu', efficiency.cpu, waste.wasteByResource.cpu || 0)
      });
    }

    // Memory optimization opportunities
    if (efficiency.memory < this.EFFICIENCY_THRESHOLDS.good) {
      opportunities.push({
        area: 'Memory Management',
        potential: (this.EFFICIENCY_THRESHOLDS.good - efficiency.memory) * 100,
        effort: this.calculateOptimizationEffort('memory', efficiency.memory),
        priority: this.calculateOptimizationPriority('memory', efficiency.memory, waste.wasteByResource.memory || 0)
      });
    }

    // Network optimization opportunities
    if (efficiency.network < this.EFFICIENCY_THRESHOLDS.good) {
      opportunities.push({
        area: 'Network Optimization',
        potential: (this.EFFICIENCY_THRESHOLDS.good - efficiency.network) * 100,
        effort: this.calculateOptimizationEffort('network', efficiency.network),
        priority: this.calculateOptimizationPriority('network', efficiency.network, waste.wasteByResource.network || 0)
      });
    }

    // Storage optimization opportunities
    if (efficiency.storage < this.EFFICIENCY_THRESHOLDS.good) {
      opportunities.push({
        area: 'Storage Optimization',
        potential: (this.EFFICIENCY_THRESHOLDS.good - efficiency.storage) * 100,
        effort: this.calculateOptimizationEffort('storage', efficiency.storage),
        priority: this.calculateOptimizationPriority('storage', efficiency.storage, waste.wasteByResource.storage || 0)
      });
    }

    // Add waste-specific opportunities
    waste.wasteReasons.forEach(reason => {
      if (reason.impact > this.WASTE_THRESHOLDS.moderate) {
        opportunities.push({
          area: `Waste Reduction: ${reason.reason}`,
          potential: reason.impact * 100,
          effort: this.estimateWasteReductionEffort(reason),
          priority: reason.impact * 10 + reason.frequency
        });
      }
    });

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate efficiency for a specific resource type
   */
  private calculateResourceEfficiency(
    metrics: ResourceMetric[],
    baseline?: ResourceMetric
  ): number {
    if (metrics.length === 0) return 0;

    // Calculate efficiency based on utilization vs. peak usage
    let totalEfficiency = 0;
    
    for (const metric of metrics) {
      if (metric.peak === 0) {
        totalEfficiency += 1; // Perfect efficiency if no peak usage
        continue;
      }

      // Efficiency = average utilization / peak utilization
      // Higher average utilization relative to peak indicates better efficiency
      const efficiency = Math.min(metric.average / metric.peak, 1.0);
      
      // Apply penalty for high variance (unstable usage)
      const stability = 1 - Math.min(this.calculateVariance(metric.values) / metric.average, 1.0);
      
      totalEfficiency += efficiency * stability;
    }

    return totalEfficiency / metrics.length;
  }

  /**
   * Calculate resource waste
   */
  private calculateResourceWaste(metrics: ResourceMetric[]): {
    percentage: number;
    reasons: WasteReason[];
  } {
    if (metrics.length === 0) {
      return { percentage: 0, reasons: [] };
    }

    let totalWaste = 0;
    const reasons: WasteReason[] = [];

    for (const metric of metrics) {
      // Identify different types of waste
      
      // 1. Overprovisioning waste (peak usage much lower than provisioned)
      if (metric.utilization < 50) { // Less than 50% utilization
        const overprovisioningWaste = (100 - metric.utilization) / 100;
        totalWaste += overprovisioningWaste;
        
        reasons.push({
          reason: 'Overprovisioning',
          impact: overprovisioningWaste,
          frequency: 1
        });
      }

      // 2. Idle time waste (periods of zero usage)
      const idleRatio = metric.values.filter(v => v === 0).length / metric.values.length;
      if (idleRatio > 0.1) { // More than 10% idle time
        totalWaste += idleRatio * 0.5; // Weight idle time as 50% waste
        
        reasons.push({
          reason: 'Idle Resources',
          impact: idleRatio * 0.5,
          frequency: idleRatio
        });
      }

      // 3. Inefficient peaks (very high variance)
      const variance = this.calculateVariance(metric.values);
      const coefficientOfVariation = variance / metric.average;
      
      if (coefficientOfVariation > 1.0) { // High variability
        const inefficiencyWaste = Math.min(coefficientOfVariation - 1.0, 0.5);
        totalWaste += inefficiencyWaste;
        
        reasons.push({
          reason: 'Inefficient Load Distribution',
          impact: inefficiencyWaste,
          frequency: coefficientOfVariation
        });
      }
    }

    return {
      percentage: Math.min(totalWaste / metrics.length, 1.0),
      reasons
    };
  }

  /**
   * Detect utilization pattern type
   */
  private detectUtilizationPattern(metric: ResourceMetric): { type: PatternType; confidence: number } {
    const values = metric.values;
    
    if (values.length < 3) {
      return { type: PatternType.CONSTANT, confidence: 0 };
    }

    // Check for constant pattern
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;

    if (coefficientOfVariation < 0.1) {
      return { type: PatternType.CONSTANT, confidence: 0.9 };
    }

    // Check for linear trend
    const { correlation } = this.calculateLinearCorrelation(values);
    if (Math.abs(correlation) > 0.8) {
      return { type: PatternType.LINEAR, confidence: Math.abs(correlation) };
    }

    // Check for exponential pattern
    const exponentialFit = this.checkExponentialFit(values);
    if (exponentialFit > 0.8) {
      return { type: PatternType.EXPONENTIAL, confidence: exponentialFit };
    }

    // Check for periodic pattern
    const periodicFit = this.checkPeriodicFit(values);
    if (periodicFit > 0.7) {
      return { type: PatternType.PERIODIC, confidence: periodicFit };
    }

    // Default to random if no clear pattern
    return { type: PatternType.RANDOM, confidence: 0.5 };
  }

  /**
   * Identify peak usage hours
   */
  private identifyPeakHours(metric: ResourceMetric, timeRange: TimeRange): number[] {
    const values = metric.values;
    const timestamps = metric.timestamps;
    
    if (values.length === 0 || timestamps.length !== values.length) {
      return [];
    }

    // Calculate percentile threshold for peaks
    const sortedValues = [...values].sort((a, b) => b - a);
    const peakThreshold = sortedValues[Math.floor(sortedValues.length * 0.1)]; // Top 10%
    
    const peakHours: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] >= peakThreshold) {
        const hour = new Date(timestamps[i]).getHours();
        if (!peakHours.includes(hour)) {
          peakHours.push(hour);
        }
      }
    }

    return peakHours.sort((a, b) => a - b);
  }

  /**
   * Helper methods
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateLinearCorrelation(values: number[]): { correlation: number; slope: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = values.reduce((sum, val) => sum + val * val, 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return { correlation: isNaN(correlation) ? 0 : correlation, slope };
  }

  private checkExponentialFit(values: number[]): number {
    // Check if log(values) fits a linear pattern
    const positiveValues = values.filter(v => v > 0);
    if (positiveValues.length < values.length * 0.8) return 0; // Too many zeros
    
    const logValues = positiveValues.map(v => Math.log(v));
    const { correlation } = this.calculateLinearCorrelation(logValues);
    
    return Math.abs(correlation);
  }

  private checkPeriodicFit(values: number[]): number {
    // Simplified periodicity check using autocorrelation
    const maxLag = Math.min(values.length / 4, 24); // Check up to 24 periods
    let maxAutocorr = 0;
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const autocorr = this.calculateAutocorrelation(values, lag);
      maxAutocorr = Math.max(maxAutocorr, Math.abs(autocorr));
    }
    
    return maxAutocorr;
  }

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

  private calculateOptimizationEfffort(resourceType: string, currentEfficiency: number): number {
    // Effort scale: 1-10 (1 = easy, 10 = very difficult)
    const effortBase = {
      cpu: 3,
      memory: 4,
      network: 6,
      storage: 2
    }[resourceType] || 5;

    // More effort needed for lower efficiency
    const efficiencyFactor = (1 - currentEfficiency) * 3;
    
    return Math.min(Math.max(effortBase + efficiencyFactor, 1), 10);
  }

  private calculateOptimizationPriority(
    resourceType: string,
    efficiency: number,
    waste: number
  ): number {
    // Priority calculation: impact (efficiency + waste) * urgency
    const impact = (1 - efficiency) * 5 + waste * 3;
    const urgency = efficiency < 0.5 ? 2 : 1; // Higher urgency for very low efficiency
    const resourceWeight = {
      cpu: 1.2,
      memory: 1.1,
      network: 1.0,
      storage: 0.9
    }[resourceType] || 1.0;

    return impact * urgency * resourceWeight;
  }

  private estimateWasteReductionEffort(reason: WasteReason): number {
    const effortMap: Record<string, number> = {
      'Overprovisioning': 2,
      'Idle Resources': 4,
      'Inefficient Load Distribution': 7,
      'Poor Resource Scheduling': 6,
      'Memory Leaks': 8,
      'Network Bottlenecks': 6
    };

    return effortMap[reason.reason] || 5;
  }

  private createEmptyEfficiencyMetrics(): EfficiencyMetrics {
    return {
      overall: 0,
      cpu: 0,
      memory: 0,
      network: 0,
      storage: 0
    };
  }
}