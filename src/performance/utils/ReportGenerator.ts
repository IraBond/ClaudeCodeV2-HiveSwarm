/**
 * Performance Report Generator
 * Creates comprehensive reports in various formats
 */

import {
  PerformanceAnalysisResult,
  ReportFormat,
  ExportFormat,
  IPerformanceReporter,
  DashboardData,
  DashboardWidget,
  WidgetType,
  DashboardLayout,
  LayoutRow
} from '../types';

export class ReportGenerator implements IPerformanceReporter {
  /**
   * Generate performance report in specified format
   */
  async generateReport(
    analysis: PerformanceAnalysisResult,
    format: ReportFormat = ReportFormat.JSON
  ): Promise<string> {
    try {
      switch (format) {
        case ReportFormat.JSON:
          return this.generateJsonReport(analysis);
        case ReportFormat.HTML:
          return this.generateHtmlReport(analysis);
        case ReportFormat.MARKDOWN:
          return this.generateMarkdownReport(analysis);
        case ReportFormat.CSV:
          return this.generateCsvReport(analysis);
        default:
          throw new Error(`Unsupported report format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate ${format} report: ${(error as Error).message}`);
    }
  }

  /**
   * Generate dashboard data structure
   */
  async generateDashboard(data: PerformanceAnalysisResult): Promise<DashboardData> {
    const widgets: DashboardWidget[] = [];

    // Performance summary widget
    widgets.push({
      id: 'performance-summary',
      type: WidgetType.METRIC,
      title: 'Performance Summary',
      data: {
        totalOperations: data.summary.totalOperations,
        avgLatency: data.summary.averageLatency,
        successRate: (data.summary.successfulOperations / data.summary.totalOperations) * 100,
        health: data.summary.overallHealth
      },
      config: {
        layout: 'grid',
        showTrend: true
      }
    });

    // Latency trend chart
    if (data.trends.length > 0) {
      const latencyTrend = data.trends.find(t => t.metricType.includes('latency'));
      if (latencyTrend) {
        widgets.push({
          id: 'latency-trend',
          type: WidgetType.LINE_CHART,
          title: 'Latency Trend',
          data: {
            trend: latencyTrend.trend,
            predictions: latencyTrend.predictions,
            changeRate: latencyTrend.changeRate
          },
          config: {
            timeWindow: '24h',
            showPrediction: true,
            alertThreshold: 5000
          }
        });
      }
    }

    // Resource utilization gauge
    widgets.push({
      id: 'resource-utilization',
      type: WidgetType.GAUGE,
      title: 'Resource Utilization',
      data: {
        cpu: data.resourceAnalysis.efficiency.cpu * 100,
        memory: data.resourceAnalysis.efficiency.memory * 100,
        network: data.resourceAnalysis.efficiency.network * 100,
        storage: data.resourceAnalysis.efficiency.storage * 100
      },
      config: {
        maxValue: 100,
        warningThreshold: 75,
        criticalThreshold: 90
      }
    });

    // Bottlenecks table
    if (data.bottlenecks.length > 0) {
      widgets.push({
        id: 'bottlenecks',
        type: WidgetType.TABLE,
        title: 'Active Bottlenecks',
        data: {
          headers: ['Type', 'Severity', 'Description', 'Impact'],
          rows: data.bottlenecks.slice(0, 10).map(b => [
            b.type,
            b.severity,
            b.description,
            `${(b.impact.severity * 100).toFixed(1)}%`
          ])
        },
        config: {
          sortable: true,
          maxRows: 10
        }
      });
    }

    // Recommendations widget
    if (data.recommendations.length > 0) {
      widgets.push({
        id: 'recommendations',
        type: WidgetType.TABLE,
        title: 'Top Recommendations',
        data: {
          headers: ['Priority', 'Title', 'Expected Impact', 'Effort'],
          rows: data.recommendations.slice(0, 5).map(r => [
            r.priority,
            r.title,
            `${r.expectedImpact.performance}%`,
            `${r.expectedImpact.timeframe} days`
          ])
        },
        config: {
          maxRows: 5,
          showPriority: true
        }
      });
    }

    // Resource efficiency heatmap
    widgets.push({
      id: 'efficiency-heatmap',
      type: WidgetType.HEATMAP,
      title: 'Resource Efficiency Heatmap',
      data: {
        resources: ['CPU', 'Memory', 'Network', 'Storage'],
        efficiency: [
          data.resourceAnalysis.efficiency.cpu,
          data.resourceAnalysis.efficiency.memory,
          data.resourceAnalysis.efficiency.network,
          data.resourceAnalysis.efficiency.storage
        ]
      },
      config: {
        colorScale: 'performance',
        showValues: true
      }
    });

    // Error rate chart
    const errorTrend = data.trends.find(t => t.metricType.includes('error'));
    if (errorTrend) {
      widgets.push({
        id: 'error-trend',
        type: WidgetType.LINE_CHART,
        title: 'Error Rate Trend',
        data: {
          trend: errorTrend.trend,
          values: errorTrend.predictions?.map(p => p.value) || [],
          timestamps: errorTrend.predictions?.map(p => p.timestamp) || []
        },
        config: {
          yAxis: 'percentage',
          alertThreshold: 5
        }
      });
    }

    // Layout configuration
    const layout: DashboardLayout = {
      rows: [
        { widgets: ['performance-summary'], height: 200 },
        { widgets: ['latency-trend', 'resource-utilization'], height: 300 },
        { widgets: ['bottlenecks'], height: 250 },
        { widgets: ['recommendations', 'efficiency-heatmap'], height: 300 },
        { widgets: ['error-trend'], height: 250 }
      ]
    };

    return {
      widgets,
      layout,
      metadata: {
        generatedAt: Date.now(),
        analysisId: data.analysisId,
        timeRange: data.timeRange,
        version: '1.0.0'
      }
    };
  }

  /**
   * Export data in specified format
   */
  async exportData(data: any, format: ExportFormat): Promise<Buffer> {
    try {
      switch (format) {
        case ExportFormat.JSON:
          return Buffer.from(JSON.stringify(data, null, 2));
        case ExportFormat.CSV:
          return Buffer.from(this.convertToCsv(data));
        case ExportFormat.XLSX:
          return this.generateExcelFile(data);
        case ExportFormat.PARQUET:
          return this.generateParquetFile(data);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to export data in ${format} format: ${(error as Error).message}`);
    }
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(analysis: PerformanceAnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(analysis: PerformanceAnalysisResult): string {
    const { summary, trends, bottlenecks, recommendations, resourceAnalysis } = analysis;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007acc; padding-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #007acc; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .metric-label { color: #666; font-size: 0.9em; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 1.5em; color: #333; margin-bottom: 15px; border-left: 4px solid #007acc; padding-left: 10px; }
        .health-${summary.overallHealth.toLowerCase()} { 
            color: ${this.getHealthColor(summary.overallHealth)}; 
        }
        .bottleneck { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
        .bottleneck.critical { background: #f8d7da; border-left-color: #dc3545; }
        .bottleneck.major { background: #fff3cd; border-left-color: #ffc107; }
        .recommendation { background: #d1ecf1; padding: 10px; margin: 10px 0; border-left: 4px solid #bee5eb; border-radius: 4px; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .efficiency-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .efficiency-fill { height: 100%; background: linear-gradient(to right, #dc3545, #ffc107, #28a745); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌀 HiveSwarm Performance Analysis Report</h1>
            <p>Analysis ID: ${analysis.analysisId}</p>
            <p>Generated: ${new Date(analysis.timestamp).toLocaleString()}</p>
            <p>Time Range: ${new Date(analysis.timeRange.start).toLocaleString()} - ${new Date(analysis.timeRange.end).toLocaleString()}</p>
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${summary.totalOperations.toLocaleString()}</div>
                <div class="metric-label">Total Operations</div>
            </div>
            <div class="metric-card">
                <div class="metric-value health-${summary.overallHealth.toLowerCase()}">${summary.overallHealth.toUpperCase()}</div>
                <div class="metric-label">System Health</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.averageLatency.toFixed(0)}ms</div>
                <div class="metric-label">Avg Latency</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.averageThroughput.toFixed(1)}</div>
                <div class="metric-label">Avg Throughput (ops/s)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(resourceAnalysis.efficiency.overall * 100).toFixed(1)}%</div>
                <div class="metric-label">Resource Efficiency</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📊 Resource Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Resource</th>
                        <th>Efficiency</th>
                        <th>Visualization</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>CPU</td>
                        <td>${(resourceAnalysis.efficiency.cpu * 100).toFixed(1)}%</td>
                        <td><div class="efficiency-bar"><div class="efficiency-fill" style="width: ${resourceAnalysis.efficiency.cpu * 100}%"></div></div></td>
                    </tr>
                    <tr>
                        <td>Memory</td>
                        <td>${(resourceAnalysis.efficiency.memory * 100).toFixed(1)}%</td>
                        <td><div class="efficiency-bar"><div class="efficiency-fill" style="width: ${resourceAnalysis.efficiency.memory * 100}%"></div></div></td>
                    </tr>
                    <tr>
                        <td>Network</td>
                        <td>${(resourceAnalysis.efficiency.network * 100).toFixed(1)}%</td>
                        <td><div class="efficiency-bar"><div class="efficiency-fill" style="width: ${resourceAnalysis.efficiency.network * 100}%"></div></div></td>
                    </tr>
                    <tr>
                        <td>Storage</td>
                        <td>${(resourceAnalysis.efficiency.storage * 100).toFixed(1)}%</td>
                        <td><div class="efficiency-bar"><div class="efficiency-fill" style="width: ${resourceAnalysis.efficiency.storage * 100}%"></div></div></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">⚠️ Performance Bottlenecks (${bottlenecks.length})</h2>
            ${bottlenecks.length === 0 ? '<p>No bottlenecks detected.</p>' : 
              bottlenecks.map(b => `
                <div class="bottleneck ${b.severity}">
                    <strong>${b.type.toUpperCase()}</strong> - ${b.severity.toUpperCase()}
                    <p>${b.description}</p>
                    <p><strong>Impact:</strong> ${(b.impact.severity * 100).toFixed(1)}% severity</p>
                    <p><strong>Suggestions:</strong> ${b.suggestions.join(', ')}</p>
                </div>
              `).join('')}
        </div>

        <div class="section">
            <h2 class="section-title">💡 Recommendations (${recommendations.length})</h2>
            ${recommendations.length === 0 ? '<p>No recommendations available.</p>' :
              recommendations.map(r => `
                <div class="recommendation priority-${r.priority}">
                    <strong>${r.priority.toUpperCase()} PRIORITY:</strong> ${r.title}
                    <p>${r.description}</p>
                    <p><strong>Expected Impact:</strong> ${r.expectedImpact.performance}% performance improvement</p>
                    <p><strong>Implementation Time:</strong> ${r.expectedImpact.timeframe} days (${r.expectedImpact.cost} hours effort)</p>
                </div>
              `).join('')}
        </div>

        <div class="section">
            <h2 class="section-title">📈 Performance Trends</h2>
            ${trends.length === 0 ? '<p>No trend data available.</p>' :
              trends.map(t => `
                <div style="margin-bottom: 15px;">
                    <h4>${t.metricType.replace(/_/g, ' ').toUpperCase()}</h4>
                    <p><strong>Trend:</strong> ${t.trend} (${(t.confidence * 100).toFixed(1)}% confidence)</p>
                    <p><strong>Change Rate:</strong> ${t.changeRate.toFixed(2)}/hour</p>
                </div>
              `).join('')}
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9em;">
            <p>Generated by HiveSwarm Performance Analysis Engine v1.0.0</p>
            <p>Report includes ${analysis.metadata.totalOperations || 0} operations across ${analysis.metadata.swarmCount || 0} swarms</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(analysis: PerformanceAnalysisResult): string {
    const { summary, trends, bottlenecks, recommendations, resourceAnalysis } = analysis;

    return `# 🌀 HiveSwarm Performance Analysis Report

**Analysis ID:** ${analysis.analysisId}  
**Generated:** ${new Date(analysis.timestamp).toLocaleString()}  
**Time Range:** ${new Date(analysis.timeRange.start).toLocaleString()} - ${new Date(analysis.timeRange.end).toLocaleString()}

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Operations | ${summary.totalOperations.toLocaleString()} |
| System Health | **${summary.overallHealth.toUpperCase()}** |
| Success Rate | ${((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1)}% |
| Average Latency | ${summary.averageLatency.toFixed(0)}ms |
| Average Throughput | ${summary.averageThroughput.toFixed(1)} ops/s |
| Peak Throughput | ${summary.peakThroughput.toFixed(1)} ops/s |
| Resource Efficiency | ${(resourceAnalysis.efficiency.overall * 100).toFixed(1)}% |

## 🔧 Resource Analysis

| Resource | Efficiency | Status |
|----------|------------|---------|
| CPU | ${(resourceAnalysis.efficiency.cpu * 100).toFixed(1)}% | ${this.getEfficiencyStatus(resourceAnalysis.efficiency.cpu)} |
| Memory | ${(resourceAnalysis.efficiency.memory * 100).toFixed(1)}% | ${this.getEfficiencyStatus(resourceAnalysis.efficiency.memory)} |
| Network | ${(resourceAnalysis.efficiency.network * 100).toFixed(1)}% | ${this.getEfficiencyStatus(resourceAnalysis.efficiency.network)} |
| Storage | ${(resourceAnalysis.efficiency.storage * 100).toFixed(1)}% | ${this.getEfficiencyStatus(resourceAnalysis.efficiency.storage)} |

### Resource Waste Analysis

**Total Waste:** ${(resourceAnalysis.waste.totalWaste * 100).toFixed(1)}%

${Object.entries(resourceAnalysis.waste.wasteByResource).length > 0 ? 
  Object.entries(resourceAnalysis.waste.wasteByResource)
    .map(([resource, waste]) => `- **${resource.toUpperCase()}:** ${(waste as number * 100).toFixed(1)}% waste`)
    .join('\n') : 'No significant waste detected.'}

## ⚠️ Performance Bottlenecks (${bottlenecks.length})

${bottlenecks.length === 0 ? '✅ No bottlenecks detected.' : 
  bottlenecks.map((b, i) => `
### ${i + 1}. ${b.type.toUpperCase()} Bottleneck - ${b.severity.toUpperCase()}

**Description:** ${b.description}

**Impact:** ${(b.impact.severity * 100).toFixed(1)}% severity affecting ${b.impact.scope}

**Root Cause:** ${b.rootCause || 'Under investigation'}

**Suggestions:**
${b.suggestions.map(s => `- ${s}`).join('\n')}

---`).join('')}

## 💡 Recommendations (${recommendations.length})

${recommendations.length === 0 ? 'No recommendations available.' :
  recommendations.map((r, i) => `
### ${i + 1}. ${r.title} (${r.priority.toUpperCase()} Priority)

**Description:** ${r.description}

**Expected Impact:**
- Performance Improvement: ${r.expectedImpact.performance}%
- Efficiency Gain: ${r.expectedImpact.efficiency}%
- Implementation Time: ${r.expectedImpact.timeframe} days
- Effort Required: ${r.expectedImpact.cost} hours

**Implementation Steps:**
${r.implementation.steps.map(step => `1. ${step}`).join('\n')}

**Prerequisites:** ${r.implementation.prerequisites.join(', ')}

**Risks:** ${r.implementation.risks.join(', ')}

---`).join('')}

## 📈 Performance Trends

${trends.length === 0 ? 'No trend data available.' :
  trends.map(t => `
### ${t.metricType.replace(/_/g, ' ').toUpperCase()}

- **Trend Direction:** ${t.trend}
- **Confidence:** ${(t.confidence * 100).toFixed(1)}%
- **Change Rate:** ${t.changeRate.toFixed(2)} per hour
${t.seasonality ? `- **Seasonality Detected:** ${t.seasonality.period}h period` : ''}

`).join('')}

## 🎯 Optimization Opportunities

${resourceAnalysis.optimization.length === 0 ? 'No specific optimization opportunities identified.' :
  resourceAnalysis.optimization.slice(0, 5).map((opt, i) => `
${i + 1}. **${opt.area}**
   - Potential Improvement: ${opt.potential.toFixed(1)}%
   - Implementation Effort: ${opt.effort}/10
   - Priority Score: ${opt.priority.toFixed(1)}
`).join('')}

---

*Generated by HiveSwarm Performance Analysis Engine v1.0.0*  
*Report includes ${analysis.metadata.totalOperations || 0} operations across ${analysis.metadata.swarmCount || 0} swarms*`;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(analysis: PerformanceAnalysisResult): string {
    const { summary, bottlenecks, recommendations } = analysis;

    const csvData = [
      ['Section', 'Metric', 'Value', 'Status'],
      ['Summary', 'Total Operations', summary.totalOperations, ''],
      ['Summary', 'System Health', summary.overallHealth, ''],
      ['Summary', 'Success Rate', ((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1) + '%', ''],
      ['Summary', 'Average Latency', summary.averageLatency.toFixed(0) + 'ms', ''],
      ['Summary', 'Average Throughput', summary.averageThroughput.toFixed(1) + ' ops/s', ''],
      ...bottlenecks.map(b => [
        'Bottleneck',
        b.type,
        b.description,
        b.severity
      ]),
      ...recommendations.map(r => [
        'Recommendation',
        r.title,
        r.description,
        r.priority
      ])
    ];

    return csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Convert data to CSV format
   */
  private convertToCsv(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate Excel file (simplified implementation)
   */
  private generateExcelFile(data: any): Buffer {
    // In a real implementation, you would use a library like 'exceljs' or 'xlsx'
    // For now, return CSV data as buffer
    const csvData = this.convertToCsv(Array.isArray(data) ? data : [data]);
    return Buffer.from(csvData);
  }

  /**
   * Generate Parquet file (simplified implementation)
   */
  private generateParquetFile(data: any): Buffer {
    // In a real implementation, you would use a Parquet library
    // For now, return JSON data as buffer
    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Helper methods
   */
  private getHealthColor(health: string): string {
    const colors = {
      excellent: '#28a745',
      good: '#28a745',
      fair: '#ffc107',
      poor: '#fd7e14',
      critical: '#dc3545'
    };
    return colors[health.toLowerCase() as keyof typeof colors] || '#6c757d';
  }

  private getEfficiencyStatus(efficiency: number): string {
    if (efficiency >= 0.9) return '🟢 Excellent';
    if (efficiency >= 0.75) return '🟡 Good';
    if (efficiency >= 0.6) return '🟠 Fair';
    return '🔴 Poor';
  }
}