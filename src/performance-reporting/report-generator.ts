/**
 * Claude-Flow Performance Reporting System - Report Generator
 * Responsible for creating formatted reports in multiple output formats
 */

import {
  IReportGenerator,
  ReportConfig,
  AnalysisResult,
  Report,
  OutputFormat,
  ReportContent,
  ReportSummary,
  ReportSection,
  ReportMetadata,
  ScheduledReport,
  PerformanceReportingError,
  ErrorCode,
  Visualization
} from './interfaces.js';

export class ReportGenerator implements IReportGenerator {
  private scheduledReports = new Map<string, ScheduledReport>();
  private reportTemplates = new Map<string, ReportTemplate>();
  private reportCache = new Map<string, CachedReport>();

  constructor() {
    this.loadDefaultTemplates();
  }

  async generate(config: ReportConfig, data: AnalysisResult): Promise<Report> {
    const startTime = Date.now();

    try {
      // Validate configuration
      this.validateConfig(config);

      // Check cache first
      const cacheKey = this.generateCacheKey(config, data);
      const cachedReport = this.reportCache.get(cacheKey);
      if (cachedReport && !this.isCacheExpired(cachedReport)) {
        return cachedReport.report;
      }

      // Generate report content
      const content = await this.generateContent(config, data);
      
      // Create report metadata
      const metadata: ReportMetadata = {
        author: 'Claude-Flow Performance System',
        version: '1.0.0',
        swarms: [data.swarmId],
        timeRange: config.timeRange,
        generationTime: Date.now() - startTime,
        dataPoints: data.statistics.metrics.TASK_DURATION?.count || 0
      };

      const report: Report = {
        id: this.generateReportId(),
        title: config.name || `Performance Report - ${data.swarmId}`,
        description: config.description || 'Automated performance analysis report',
        timestamp: Date.now(),
        format: config.outputFormat,
        content,
        metadata
      };

      // Cache the report
      this.cacheReport(cacheKey, report);

      return report;
    } catch (error) {
      throw new PerformanceReportingError(
        `Report generation failed: ${error.message}`,
        ErrorCode.REPORT_GENERATION_FAILED,
        'ReportGenerator',
        { config: config.name, error: error.message }
      );
    }
  }

  async export(report: Report, format: OutputFormat): Promise<string> {
    try {
      switch (format) {
        case OutputFormat.JSON:
          return this.exportToJSON(report);
        case OutputFormat.HTML:
          return this.exportToHTML(report);
        case OutputFormat.MARKDOWN:
          return this.exportToMarkdown(report);
        case OutputFormat.PDF:
          return this.exportToPDF(report);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new PerformanceReportingError(
        `Export failed: ${error.message}`,
        ErrorCode.REPORT_GENERATION_FAILED,
        'ReportGenerator',
        { reportId: report.id, format, error: error.message }
      );
    }
  }

  async schedule(config: ReportConfig): Promise<void> {
    if (!config.schedule?.enabled) {
      throw new PerformanceReportingError(
        'Schedule configuration is required',
        ErrorCode.CONFIGURATION_ERROR,
        'ReportGenerator'
      );
    }

    const scheduledReport: ScheduledReport = {
      id: this.generateReportId(),
      config,
      nextRun: this.calculateNextRun(config.schedule),
      status: 'active'
    };

    this.scheduledReports.set(scheduledReport.id, scheduledReport);

    // Set up the actual scheduling
    this.setupReportSchedule(scheduledReport);
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return Array.from(this.scheduledReports.values());
  }

  async cancelScheduledReport(reportId: string): Promise<void> {
    const scheduledReport = this.scheduledReports.get(reportId);
    if (!scheduledReport) {
      throw new PerformanceReportingError(
        `Scheduled report not found: ${reportId}`,
        ErrorCode.CONFIGURATION_ERROR,
        'ReportGenerator'
      );
    }

    scheduledReport.status = 'paused';
    this.scheduledReports.delete(reportId);
  }

  // Private methods

  private async generateContent(config: ReportConfig, data: AnalysisResult): Promise<ReportContent> {
    const template = this.getTemplate(config.template);
    
    // Generate executive summary
    const summary = await this.generateSummary(data);
    
    // Generate main sections
    const sections = await this.generateSections(config, data, template);
    
    // Process visualizations
    const visualizations = await this.processVisualizations(config.visualizations, data);
    
    return {
      summary,
      sections,
      visualizations,
      appendices: []
    };
  }

  private async generateSummary(data: AnalysisResult): Promise<ReportSummary> {
    const keyFindings = data.insights
      .filter(insight => insight.impact === 'high')
      .slice(0, 5)
      .map(insight => insight.title);

    const recommendations = data.recommendations
      .slice(0, 3)
      .map(rec => rec.title);

    const executiveSummary = this.generateExecutiveSummaryText(data);

    return {
      executiveSummary,
      keyFindings,
      recommendations,
      nextSteps: [
        'Review high-impact insights and implement suggested optimizations',
        'Monitor performance metrics for the next 24 hours',
        'Schedule follow-up analysis in one week'
      ]
    };
  }

  private async generateSections(
    config: ReportConfig, 
    data: AnalysisResult, 
    template: ReportTemplate
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Performance Overview Section
    sections.push({
      id: 'performance-overview',
      title: 'Performance Overview',
      content: this.generatePerformanceOverview(data),
      visualizations: ['performance-trends', 'metric-distribution']
    });

    // Insights Section
    if (data.insights.length > 0) {
      sections.push({
        id: 'insights',
        title: 'Key Insights',
        content: this.generateInsightsSection(data.insights),
        data: data.insights
      });
    }

    // Anomalies Section
    if (data.anomalies.length > 0) {
      sections.push({
        id: 'anomalies',
        title: 'Detected Anomalies',
        content: this.generateAnomaliesSection(data.anomalies),
        data: data.anomalies
      });
    }

    // Trends Section
    if (data.trends.length > 0) {
      sections.push({
        id: 'trends',
        title: 'Performance Trends',
        content: this.generateTrendsSection(data.trends),
        visualizations: ['trend-analysis'],
        data: data.trends
      });
    }

    // Statistical Analysis Section
    sections.push({
      id: 'statistics',
      title: 'Statistical Analysis',
      content: this.generateStatisticsSection(data.statistics),
      visualizations: ['correlation-matrix', 'distribution-histograms'],
      data: data.statistics
    });

    // Recommendations Section
    if (data.recommendations.length > 0) {
      sections.push({
        id: 'recommendations',
        title: 'Recommendations',
        content: this.generateRecommendationsSection(data.recommendations),
        data: data.recommendations
      });
    }

    return sections;
  }

  private generateExecutiveSummaryText(data: AnalysisResult): string {
    const stats = data.statistics;
    const taskDurationStats = stats.metrics.TASK_DURATION;
    const errorRateStats = stats.metrics.ERROR_RATE;
    
    const avgDuration = taskDurationStats?.mean || 0;
    const errorRate = errorRateStats?.mean || 0;
    const successRate = (1 - errorRate) * 100;

    return `
Performance analysis completed for swarm ${data.swarmId}. The swarm processed ${taskDurationStats?.count || 0} tasks with an average execution time of ${avgDuration.toFixed(2)}ms and a ${successRate.toFixed(1)}% success rate.

${data.insights.length} key insights were identified, with ${data.insights.filter(i => i.impact === 'high').length} requiring immediate attention. ${data.anomalies.length} anomalies were detected during the analysis period.

Overall performance assessment: ${this.assessPerformanceLevel(data)}
    `.trim();
  }

  private generatePerformanceOverview(data: AnalysisResult): string {
    const metrics = data.statistics.metrics;
    
    return `
## Performance Metrics Summary

**Task Performance:**
- Average Duration: ${metrics.TASK_DURATION?.mean?.toFixed(2) || 'N/A'}ms
- 95th Percentile: ${metrics.TASK_DURATION?.percentiles?.p95?.toFixed(2) || 'N/A'}ms
- Task Count: ${metrics.TASK_DURATION?.count || 0}

**Resource Utilization:**
- Memory Usage: ${(metrics.MEMORY_USAGE?.mean * 100)?.toFixed(1) || 'N/A'}%
- CPU Usage: ${(metrics.CPU_USAGE?.mean * 100)?.toFixed(1) || 'N/A'}%

**Reliability:**
- Error Rate: ${(metrics.ERROR_RATE?.mean * 100)?.toFixed(2) || 'N/A'}%
- Success Rate: ${((1 - (metrics.ERROR_RATE?.mean || 0)) * 100).toFixed(2)}%

**Neural Processing:**
- Average Processing Time: ${metrics.NEURAL_PROCESSING_TIME?.mean?.toFixed(2) || 'N/A'}ms
- Token Usage: ${metrics.TOKEN_USAGE?.mean?.toFixed(0) || 'N/A'} tokens per operation
    `.trim();
  }

  private generateInsightsSection(insights: any[]): string {
    let content = '## Analysis Insights\n\n';
    
    insights.forEach((insight, index) => {
      content += `### ${index + 1}. ${insight.title}\n`;
      content += `**Impact:** ${insight.impact.toUpperCase()}\n`;
      content += `**Confidence:** ${(insight.confidence * 100).toFixed(1)}%\n\n`;
      content += `${insight.description}\n\n`;
      
      if (insight.actionable) {
        content += '*This insight is actionable and requires attention.*\n\n';
      }
    });

    return content;
  }

  private generateAnomaliesSection(anomalies: any[]): string {
    let content = '## Detected Anomalies\n\n';
    
    anomalies.forEach((anomaly, index) => {
      content += `### ${index + 1}. ${anomaly.description}\n`;
      content += `**Metric:** ${anomaly.metricType}\n`;
      content += `**Severity:** ${anomaly.severity.toUpperCase()}\n`;
      content += `**Timestamp:** ${new Date(anomaly.timestamp).toISOString()}\n`;
      content += `**Expected:** ${anomaly.expectedValue}, **Actual:** ${anomaly.value}\n`;
      content += `**Deviation:** ${(anomaly.deviation * 100).toFixed(1)}%\n\n`;
      
      if (anomaly.possibleCauses.length > 0) {
        content += '**Possible Causes:**\n';
        anomaly.possibleCauses.forEach(cause => {
          content += `- ${cause}\n`;
        });
        content += '\n';
      }
    });

    return content;
  }

  private generateTrendsSection(trends: any[]): string {
    let content = '## Performance Trends\n\n';
    
    trends.forEach((trend, index) => {
      const direction = trend.direction === 'improving' ? '📈' : 
                       trend.direction === 'degrading' ? '📉' : '➡️';
      
      content += `### ${direction} ${trend.metricType}\n`;
      content += `**Direction:** ${trend.direction}\n`;
      content += `**Rate:** ${trend.rate.toFixed(3)} per unit time\n`;
      content += `**Confidence:** ${(trend.confidence * 100).toFixed(1)}%\n\n`;
      
      if (trend.prediction) {
        content += `**Prediction:** ${trend.prediction.nextValue.toFixed(2)} `;
        content += `(${(trend.prediction.confidence * 100).toFixed(1)}% confidence)\n\n`;
      }
    });

    return content;
  }

  private generateStatisticsSection(statistics: any): string {
    let content = '## Statistical Analysis\n\n';
    
    Object.entries(statistics.metrics).forEach(([metricType, stats]: [string, any]) => {
      if (!stats) return;
      
      content += `### ${metricType}\n`;
      content += `- Count: ${stats.count}\n`;
      content += `- Mean: ${stats.mean?.toFixed(3)}\n`;
      content += `- Median: ${stats.median?.toFixed(3)}\n`;
      content += `- Std Dev: ${stats.stdDev?.toFixed(3)}\n`;
      content += `- Min: ${stats.min?.toFixed(3)}\n`;
      content += `- Max: ${stats.max?.toFixed(3)}\n`;
      content += '\n';
    });

    if (statistics.correlations.pairs.length > 0) {
      content += '### Metric Correlations\n\n';
      statistics.correlations.pairs.forEach(pair => {
        content += `- **${pair.metric1}** ↔ **${pair.metric2}**: `;
        content += `${pair.correlation.toFixed(3)} (p=${pair.significance.toFixed(3)})\n`;
      });
    }

    return content;
  }

  private generateRecommendationsSection(recommendations: any[]): string {
    let content = '## Recommendations\n\n';
    
    recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : 
                      rec.priority === 'medium' ? '🟡' : '🟢';
      
      content += `### ${priority} ${index + 1}. ${rec.title}\n`;
      content += `**Priority:** ${rec.priority.toUpperCase()}\n`;
      content += `**Expected Improvement:** ${(rec.expectedImprovement * 100).toFixed(1)}%\n`;
      content += `**Effort:** ${rec.effort.toUpperCase()}\n\n`;
      content += `${rec.description}\n\n`;
    });

    return content;
  }

  private async processVisualizations(
    vizConfigs: any[], 
    data: AnalysisResult
  ): Promise<Visualization[]> {
    // This would integrate with the VisualizationRenderer
    // For now, return empty array as visualizations are handled separately
    return [];
  }

  private exportToJSON(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  private exportToHTML(report: Report): string {
    const template = this.getHTMLTemplate();
    
    let html = template.replace('{{title}}', report.title);
    html = html.replace('{{description}}', report.description);
    html = html.replace('{{timestamp}}', new Date(report.timestamp).toISOString());
    html = html.replace('{{content}}', this.convertContentToHTML(report.content));
    
    return html;
  }

  private exportToMarkdown(report: Report): string {
    let markdown = `# ${report.title}\n\n`;
    markdown += `*Generated: ${new Date(report.timestamp).toISOString()}*\n\n`;
    markdown += `${report.description}\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `${report.content.summary.executiveSummary}\n\n`;
    
    // Key Findings
    if (report.content.summary.keyFindings.length > 0) {
      markdown += `### Key Findings\n\n`;
      report.content.summary.keyFindings.forEach(finding => {
        markdown += `- ${finding}\n`;
      });
      markdown += '\n';
    }
    
    // Sections
    report.content.sections.forEach(section => {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
    });
    
    // Recommendations
    if (report.content.summary.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.content.summary.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += '\n';
    }
    
    // Metadata
    markdown += `## Report Metadata\n\n`;
    markdown += `- **Author:** ${report.metadata.author}\n`;
    markdown += `- **Version:** ${report.metadata.version}\n`;
    markdown += `- **Generation Time:** ${report.metadata.generationTime}ms\n`;
    markdown += `- **Data Points:** ${report.metadata.dataPoints}\n`;
    
    return markdown;
  }

  private exportToPDF(report: Report): string {
    // PDF generation would require additional libraries like puppeteer
    throw new Error('PDF export not implemented yet');
  }

  private convertContentToHTML(content: ReportContent): string {
    let html = '';
    
    // Executive Summary
    html += '<div class="executive-summary">';
    html += '<h2>Executive Summary</h2>';
    html += `<p>${content.summary.executiveSummary}</p>`;
    html += '</div>';
    
    // Sections
    content.sections.forEach(section => {
      html += `<div class="section" id="${section.id}">`;
      html += `<h2>${section.title}</h2>`;
      html += this.markdownToHTML(section.content);
      html += '</div>';
    });
    
    return html;
  }

  private markdownToHTML(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>');
  }

  private getHTMLTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; margin-bottom: 30px; }
        .section { margin: 30px 0; }
        .executive-summary { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .insight-high { color: #d32f2f; }
        .insight-medium { color: #f57c00; }
        .insight-low { color: #388e3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        <p><em>Generated: {{timestamp}}</em></p>
    </div>
    <div class="content">
        {{content}}
    </div>
</body>
</html>`;
  }

  private validateConfig(config: ReportConfig): void {
    if (!config.name) {
      throw new Error('Report name is required');
    }
    if (!config.outputFormat) {
      throw new Error('Output format is required');
    }
    if (!Object.values(OutputFormat).includes(config.outputFormat)) {
      throw new Error(`Invalid output format: ${config.outputFormat}`);
    }
  }

  private assessPerformanceLevel(data: AnalysisResult): string {
    const highImpactInsights = data.insights.filter(i => i.impact === 'high').length;
    const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical').length;
    const errorRate = data.statistics.metrics.ERROR_RATE?.mean || 0;
    
    if (criticalAnomalies > 0 || errorRate > 0.1 || highImpactInsights > 3) {
      return 'NEEDS ATTENTION';
    } else if (errorRate > 0.05 || highImpactInsights > 1) {
      return 'FAIR';
    } else {
      return 'GOOD';
    }
  }

  private generateCacheKey(config: ReportConfig, data: AnalysisResult): string {
    return `${config.id}_${data.swarmId}_${data.timestamp}`;
  }

  private isCacheExpired(cachedReport: CachedReport): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cachedReport.timestamp > maxAge;
  }

  private cacheReport(key: string, report: Report): void {
    this.reportCache.set(key, {
      report,
      timestamp: Date.now()
    });
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTemplate(templateName?: string): ReportTemplate {
    return this.reportTemplates.get(templateName || 'default') || this.getDefaultTemplate();
  }

  private loadDefaultTemplates(): void {
    this.reportTemplates.set('default', this.getDefaultTemplate());
  }

  private getDefaultTemplate(): ReportTemplate {
    return {
      name: 'default',
      sections: ['overview', 'insights', 'anomalies', 'trends', 'statistics', 'recommendations'],
      styling: {},
      visualizations: []
    };
  }

  private setupReportSchedule(scheduledReport: ScheduledReport): void {
    // This would integrate with a job scheduler like cron or Bull Queue
    console.log(`Scheduled report ${scheduledReport.id} for next run: ${new Date(scheduledReport.nextRun)}`);
  }

  private calculateNextRun(schedule: any): number {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'hourly':
        return now.getTime() + 60 * 60 * 1000;
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.getTime();
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.getTime();
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.getTime();
      default:
        return now.getTime() + 24 * 60 * 60 * 1000;
    }
  }
}

// Helper interfaces
interface ReportTemplate {
  name: string;
  sections: string[];
  styling: Record<string, any>;
  visualizations: string[];
}

interface CachedReport {
  report: Report;
  timestamp: number;
}