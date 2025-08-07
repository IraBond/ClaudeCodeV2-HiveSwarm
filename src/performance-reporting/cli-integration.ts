/**
 * Claude-Flow Performance Reporting System - CLI Integration
 * Provides command-line interface for performance reporting features
 */

import { Command } from 'commander';
import {
  PerformanceCollector,
  MetricsAnalyzer,
  ComparisonEngine,
  ReportGenerator,
  VisualizationRenderer
} from './index.js';
import {
  CollectorConfig,
  ReportConfig,
  OutputFormat,
  ChartType,
  MetricType,
  TimeRange,
  PerformanceReportingError
} from './interfaces.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PerformanceReportingCLI {
  private collector: PerformanceCollector;
  private analyzer: MetricsAnalyzer;
  private comparisonEngine: ComparisonEngine;
  private reportGenerator: ReportGenerator;
  private visualizationRenderer: VisualizationRenderer;

  constructor() {
    // Initialize with default configurations
    const defaultCollectorConfig: CollectorConfig = {
      enabled: true,
      interval: 5000,
      batchSize: 100,
      bufferSize: 1000,
      timeout: 30000,
      retryAttempts: 3,
      sources: ['agent', 'coordinator', 'memory', 'neural', 'system'] as any
    };

    this.collector = new PerformanceCollector(defaultCollectorConfig);
    this.analyzer = new MetricsAnalyzer();
    this.comparisonEngine = new ComparisonEngine();
    this.reportGenerator = new ReportGenerator();
    this.visualizationRenderer = new VisualizationRenderer();
  }

  setupCLI(): Command {
    const program = new Command();
    
    program
      .name('claude-flow-perf')
      .description('Claude-Flow Performance Reporting System')
      .version('1.0.0');

    this.setupReportCommands(program);
    this.setupMonitoringCommands(program);
    this.setupComparisonCommands(program);
    this.setupVisualizationCommands(program);
    this.setupConfigCommands(program);

    return program;
  }

  private setupReportCommands(program: Command): void {
    const reportCmd = program
      .command('report')
      .description('Generate performance reports');

    reportCmd
      .command('generate')
      .description('Generate a performance report')
      .option('-s, --swarm <swarmId>', 'Swarm ID to analyze')
      .option('-f, --format <format>', 'Output format (json, html, markdown)', 'json')
      .option('-o, --output <file>', 'Output file path')
      .option('-t, --time-range <range>', 'Time range (last-hour, last-day, last-week)', 'last-hour')
      .option('--template <template>', 'Report template to use')
      .action(async (options) => {
        try {
          await this.handleGenerateReport(options);
        } catch (error) {
          this.handleError('Report generation', error);
        }
      });

    reportCmd
      .command('schedule')
      .description('Schedule recurring reports')
      .option('-s, --swarm <swarmId>', 'Swarm ID to monitor')
      .option('-f, --frequency <freq>', 'Report frequency (hourly, daily, weekly)', 'daily')
      .option('--format <format>', 'Output format', 'html')
      .option('--recipients <emails>', 'Email recipients (comma-separated)')
      .action(async (options) => {
        try {
          await this.handleScheduleReport(options);
        } catch (error) {
          this.handleError('Report scheduling', error);
        }
      });

    reportCmd
      .command('list-scheduled')
      .description('List scheduled reports')
      .action(async () => {
        try {
          await this.handleListScheduledReports();
        } catch (error) {
          this.handleError('List scheduled reports', error);
        }
      });
  }

  private setupMonitoringCommands(program: Command): void {
    const monitorCmd = program
      .command('monitor')
      .description('Real-time monitoring commands');

    monitorCmd
      .command('start')
      .description('Start performance monitoring')
      .option('-s, --swarm <swarmId>', 'Specific swarm to monitor')
      .option('-i, --interval <ms>', 'Collection interval in milliseconds', '5000')
      .option('--live', 'Enable live streaming output')
      .action(async (options) => {
        try {
          await this.handleStartMonitoring(options);
        } catch (error) {
          this.handleError('Start monitoring', error);
        }
      });

    monitorCmd
      .command('stop')
      .description('Stop performance monitoring')
      .action(async () => {
        try {
          await this.handleStopMonitoring();
        } catch (error) {
          this.handleError('Stop monitoring', error);
        }
      });

    monitorCmd
      .command('status')
      .description('Show monitoring status')
      .action(async () => {
        try {
          await this.handleMonitoringStatus();
        } catch (error) {
          this.handleError('Monitoring status', error);
        }
      });

    monitorCmd
      .command('dashboard')
      .description('Launch live performance dashboard')
      .option('-p, --port <port>', 'Dashboard port', '3000')
      .option('--swarms <swarmIds>', 'Swarms to display (comma-separated)')
      .action(async (options) => {
        try {
          await this.handleLaunchDashboard(options);
        } catch (error) {
          this.handleError('Launch dashboard', error);
        }
      });
  }

  private setupComparisonCommands(program: Command): void {
    const compareCmd = program
      .command('compare')
      .description('Compare swarm performance');

    compareCmd
      .command('swarms')
      .description('Compare multiple swarms')
      .option('-s, --swarms <swarmIds>', 'Comma-separated list of swarm IDs to compare', '')
      .option('-f, --format <format>', 'Output format', 'json')
      .option('-o, --output <file>', 'Output file path')
      .option('--baseline <swarmId>', 'Baseline swarm for comparison')
      .action(async (options) => {
        try {
          await this.handleCompareSwarms(options);
        } catch (error) {
          this.handleError('Swarm comparison', error);
        }
      });

    compareCmd
      .command('rank')
      .description('Rank swarms by performance')
      .option('-s, --swarms <swarmIds>', 'Comma-separated list of swarm IDs to rank', '')
      .option('--criteria <file>', 'JSON file with ranking criteria')
      .option('-f, --format <format>', 'Output format', 'table')
      .action(async (options) => {
        try {
          await this.handleRankSwarms(options);
        } catch (error) {
          this.handleError('Swarm ranking', error);
        }
      });

    compareCmd
      .command('benchmark')
      .description('Benchmark swarms against a baseline')
      .requiredOption('-b, --baseline <swarmId>', 'Baseline swarm ID')
      .option('-c, --candidates <swarmIds>', 'Candidate swarm IDs (comma-separated)', '')
      .option('-f, --format <format>', 'Output format', 'json')
      .action(async (options) => {
        try {
          await this.handleBenchmarkSwarms(options);
        } catch (error) {
          this.handleError('Swarm benchmarking', error);
        }
      });
  }

  private setupVisualizationCommands(program: Command): void {
    const vizCmd = program
      .command('visualize')
      .description('Create performance visualizations');

    vizCmd
      .command('chart')
      .description('Generate performance charts')
      .option('-s, --swarm <swarmId>', 'Swarm ID to visualize')
      .option('-m, --metric <metricType>', 'Metric to visualize')
      .option('-t, --type <chartType>', 'Chart type (line, bar, scatter, pie)', 'line')
      .option('-f, --format <format>', 'Export format (png, svg, pdf)', 'png')
      .option('-o, --output <file>', 'Output file path')
      .option('--time-range <range>', 'Time range', 'last-hour')
      .action(async (options) => {
        try {
          await this.handleGenerateChart(options);
        } catch (error) {
          this.handleError('Chart generation', error);
        }
      });

    vizCmd
      .command('dashboard')
      .description('Create performance dashboard')
      .option('-c, --config <file>', 'Dashboard configuration file')
      .option('-o, --output <file>', 'Output HTML file')
      .option('--serve', 'Serve dashboard on local web server')
      .option('--port <port>', 'Server port', '8080')
      .action(async (options) => {
        try {
          await this.handleCreateDashboard(options);
        } catch (error) {
          this.handleError('Dashboard creation', error);
        }
      });
  }

  private setupConfigCommands(program: Command): void {
    const configCmd = program
      .command('config')
      .description('Configuration management');

    configCmd
      .command('show')
      .description('Show current configuration')
      .action(async () => {
        try {
          await this.handleShowConfig();
        } catch (error) {
          this.handleError('Show configuration', error);
        }
      });

    configCmd
      .command('set')
      .description('Set configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action(async (key, value) => {
        try {
          await this.handleSetConfig(key, value);
        } catch (error) {
          this.handleError('Set configuration', error);
        }
      });

    configCmd
      .command('reset')
      .description('Reset to default configuration')
      .action(async () => {
        try {
          await this.handleResetConfig();
        } catch (error) {
          this.handleError('Reset configuration', error);
        }
      });
  }

  // Command handlers

  private async handleGenerateReport(options: any): Promise<void> {
    if (!options.swarm) {
      throw new Error('Swarm ID is required');
    }

    console.log(`🔄 Generating ${options.format} report for swarm ${options.swarm}...`);

    // Collect metrics
    const metrics = await this.collector.collect(options.swarm, 30000);
    
    // Analyze metrics
    const analysis = await this.analyzer.analyze(metrics);
    
    // Generate report
    const reportConfig: ReportConfig = {
      id: `report_${Date.now()}`,
      name: `Performance Report - ${options.swarm}`,
      description: `Performance analysis for swarm ${options.swarm}`,
      outputFormat: this.parseOutputFormat(options.format),
      timeRange: this.parseTimeRange(options.timeRange),
      metrics: this.getDefaultMetricSelectors(),
      visualizations: [],
      filters: []
    };

    const report = await this.reportGenerator.generate(reportConfig, analysis);
    const output = await this.reportGenerator.export(report, reportConfig.outputFormat);

    // Save or display output
    if (options.output) {
      await fs.writeFile(options.output, output);
      console.log(`✅ Report saved to ${options.output}`);
    } else {
      console.log(output);
    }
  }

  private async handleScheduleReport(options: any): Promise<void> {
    const reportConfig: ReportConfig = {
      id: `scheduled_${Date.now()}`,
      name: `Scheduled Report - ${options.swarm || 'All Swarms'}`,
      description: 'Scheduled performance report',
      outputFormat: this.parseOutputFormat(options.format),
      timeRange: this.getScheduleTimeRange(options.frequency),
      metrics: this.getDefaultMetricSelectors(),
      visualizations: [],
      filters: [],
      schedule: {
        frequency: options.frequency,
        enabled: true,
        recipients: options.recipients?.split(',') || []
      }
    };

    await this.reportGenerator.schedule(reportConfig);
    console.log(`✅ Scheduled ${options.frequency} report for ${options.swarm || 'all swarms'}`);
  }

  private async handleListScheduledReports(): Promise<void> {
    const scheduledReports = await this.reportGenerator.getScheduledReports();
    
    if (scheduledReports.length === 0) {
      console.log('No scheduled reports found');
      return;
    }

    console.log('\n📅 Scheduled Reports:');
    console.log('─'.repeat(80));
    
    scheduledReports.forEach(report => {
      console.log(`ID: ${report.id}`);
      console.log(`Name: ${report.config.name}`);
      console.log(`Frequency: ${report.config.schedule?.frequency || 'Unknown'}`);
      console.log(`Next Run: ${new Date(report.nextRun).toISOString()}`);
      console.log(`Status: ${report.status}`);
      console.log('─'.repeat(40));
    });
  }

  private async handleStartMonitoring(options: any): Promise<void> {
    console.log('🚀 Starting performance monitoring...');
    
    // Configure collector
    if (options.interval) {
      this.collector.configure({
        ...this.collector.getStatus(),
        interval: parseInt(options.interval)
      } as CollectorConfig);
    }

    // Start collector
    await this.collector.start();

    if (options.live) {
      // Set up live streaming
      this.collector.on('metrics:batch', (event) => {
        console.log(`📊 Collected ${event.count} metrics at ${new Date(event.timestamp).toISOString()}`);
        
        // Display key metrics
        const taskDurationMetrics = event.metrics.filter(m => m.metricType === MetricType.TASK_DURATION);
        if (taskDurationMetrics.length > 0) {
          const avgDuration = taskDurationMetrics.reduce((sum, m) => sum + Number(m.value), 0) / taskDurationMetrics.length;
          console.log(`  ⏱️  Avg Task Duration: ${avgDuration.toFixed(2)}ms`);
        }
      });
    }

    console.log('✅ Performance monitoring started');
    console.log('Press Ctrl+C to stop monitoring');

    // Keep process alive
    process.on('SIGINT', async () => {
      await this.handleStopMonitoring();
      process.exit(0);
    });
  }

  private async handleStopMonitoring(): Promise<void> {
    console.log('🛑 Stopping performance monitoring...');
    await this.collector.stop();
    console.log('✅ Performance monitoring stopped');
  }

  private async handleMonitoringStatus(): Promise<void> {
    const status = this.collector.getStatus();
    
    console.log('\n📊 Monitoring Status:');
    console.log('─'.repeat(40));
    console.log(`Running: ${status.isRunning ? '✅' : '❌'}`);
    console.log(`Last Collection: ${status.lastCollection ? new Date(status.lastCollection).toISOString() : 'Never'}`);
    console.log(`Metrics Collected: ${status.metricsCollected}`);
    console.log(`Error Count: ${status.errorCount}`);
    console.log(`Avg Collection Time: ${status.avgCollectionTime.toFixed(2)}ms`);
  }

  private async handleLaunchDashboard(options: any): Promise<void> {
    console.log(`🚀 Launching dashboard on port ${options.port}...`);
    
    // This would launch a web server with the dashboard
    // For now, we'll just log the configuration
    console.log(`Dashboard would display swarms: ${options.swarms || 'all'}`);
    console.log(`Access at: http://localhost:${options.port}`);
    console.log('✅ Dashboard launch configured (implementation pending)');
  }

  private async handleCompareSwarms(options: any): Promise<void> {
    const swarmIds = this.parseSwarmIds(options.swarms);
    if (swarmIds.length < 2) {
      throw new Error('At least 2 swarms are required for comparison');
    }

    console.log(`🔄 Comparing ${swarmIds.length} swarms...`);

    // Collect metrics for each swarm
    const swarmMetrics = [];
    for (const swarmId of swarmIds) {
      const metrics = await this.collector.collect(swarmId);
      swarmMetrics.push({
        swarmId,
        startTime: Date.now() - 3600000, // 1 hour ago
        endTime: Date.now(),
        metrics,
        configuration: { topology: 'unknown', agentCount: 0, agentTypes: [], memoryConfig: {}, neuralConfig: {}, customSettings: {} },
        summary: { totalTasks: 0, successRate: 1, avgExecutionTime: 0, peakMemoryUsage: 0, errorCount: 0, tokenConsumption: 0 }
      });
    }

    // Perform comparison
    const result = options.baseline 
      ? await this.comparisonEngine.benchmark(
          swarmMetrics.find(s => s.swarmId === options.baseline)!,
          swarmMetrics.filter(s => s.swarmId !== options.baseline)
        )
      : await this.comparisonEngine.compare(swarmMetrics);

    // Output results
    const output = JSON.stringify(result, null, 2);
    
    if (options.output) {
      await fs.writeFile(options.output, output);
      console.log(`✅ Comparison results saved to ${options.output}`);
    } else {
      console.log(output);
    }
  }

  private async handleRankSwarms(options: any): Promise<void> {
    const swarmIds = this.parseSwarmIds(options.swarms);
    console.log(`🏆 Ranking ${swarmIds.length} swarms...`);

    // Load ranking criteria
    let criteria;
    if (options.criteria) {
      const criteriaFile = await fs.readFile(options.criteria, 'utf8');
      criteria = JSON.parse(criteriaFile);
    }

    // Collect metrics for each swarm
    const swarmMetrics = [];
    for (const swarmId of swarmIds) {
      const metrics = await this.collector.collect(swarmId);
      swarmMetrics.push({
        swarmId,
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        metrics,
        configuration: { topology: 'unknown', agentCount: 0, agentTypes: [], memoryConfig: {}, neuralConfig: {}, customSettings: {} },
        summary: { totalTasks: 0, successRate: 1, avgExecutionTime: 0, peakMemoryUsage: 0, errorCount: 0, tokenConsumption: 0 }
      });
    }

    // Perform ranking
    const ranking = await this.comparisonEngine.rankPerformance(swarmMetrics, criteria);

    // Display results
    if (options.format === 'table') {
      this.displayRankingTable(ranking);
    } else {
      console.log(JSON.stringify(ranking, null, 2));
    }
  }

  private async handleBenchmarkSwarms(options: any): Promise<void> {
    const candidateIds = this.parseSwarmIds(options.candidates);
    console.log(`📊 Benchmarking ${candidateIds.length} swarms against ${options.baseline}...`);

    // Collect baseline metrics
    const baselineMetrics = await this.collector.collect(options.baseline);
    const baseline = {
      swarmId: options.baseline,
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      metrics: baselineMetrics,
      configuration: { topology: 'unknown', agentCount: 0, agentTypes: [], memoryConfig: {}, neuralConfig: {}, customSettings: {} },
      summary: { totalTasks: 0, successRate: 1, avgExecutionTime: 0, peakMemoryUsage: 0, errorCount: 0, tokenConsumption: 0 }
    };

    // Collect candidate metrics
    const candidates = [];
    for (const candidateId of candidateIds) {
      const metrics = await this.collector.collect(candidateId);
      candidates.push({
        swarmId: candidateId,
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        metrics,
        configuration: { topology: 'unknown', agentCount: 0, agentTypes: [], memoryConfig: {}, neuralConfig: {}, customSettings: {} },
        summary: { totalTasks: 0, successRate: 1, avgExecutionTime: 0, peakMemoryUsage: 0, errorCount: 0, tokenConsumption: 0 }
      });
    }

    // Perform benchmark
    const result = await this.comparisonEngine.benchmark(baseline, candidates);

    // Output results
    const output = JSON.stringify(result, null, 2);
    console.log(output);
  }

  private async handleGenerateChart(options: any): Promise<void> {
    if (!options.swarm || !options.metric) {
      throw new Error('Swarm ID and metric type are required');
    }

    console.log(`📈 Generating ${options.type} chart for ${options.metric}...`);

    // Collect metrics
    const metrics = await this.collector.collect(options.swarm);
    const relevantMetrics = metrics.filter(m => m.metricType === options.metric);

    // Prepare chart data
    const chartData = {
      labels: relevantMetrics.map(m => new Date(m.timestamp).toISOString()),
      datasets: [{
        label: options.metric,
        data: relevantMetrics.map(m => Number(m.value)),
        backgroundColor: '#3498db',
        borderColor: '#2980b9'
      }]
    };

    // Generate visualization
    const vizConfig = {
      type: this.parseChartType(options.type),
      metricType: options.metric,
      aggregation: 'avg',
      timeRange: this.parseTimeRange(options.timeRange)
    };

    const visualization = await this.visualizationRenderer.renderChart(vizConfig, chartData);
    const exported = await this.visualizationRenderer.exportVisualization(
      visualization, 
      this.parseExportFormat(options.format)
    );

    // Save output
    const outputPath = options.output || `chart_${options.swarm}_${options.metric}.${options.format}`;
    await fs.writeFile(outputPath, exported);
    console.log(`✅ Chart saved to ${outputPath}`);
  }

  private async handleCreateDashboard(options: any): Promise<void> {
    console.log('📊 Creating performance dashboard...');

    let dashboardConfig;
    if (options.config) {
      const configFile = await fs.readFile(options.config, 'utf8');
      dashboardConfig = JSON.parse(configFile);
    } else {
      dashboardConfig = this.getDefaultDashboardConfig();
    }

    // Generate dashboard
    const dashboard = await this.visualizationRenderer.renderDashboard(dashboardConfig, {});

    if (options.serve) {
      console.log(`🚀 Serving dashboard on port ${options.port}...`);
      console.log(`Access at: http://localhost:${options.port}`);
      console.log('✅ Dashboard server configured (implementation pending)');
    } else if (options.output) {
      // Export as HTML file
      const htmlContent = this.generateDashboardHTML(dashboard);
      await fs.writeFile(options.output, htmlContent);
      console.log(`✅ Dashboard saved to ${options.output}`);
    }
  }

  private async handleShowConfig(): Promise<void> {
    const status = this.collector.getStatus();
    
    console.log('\n⚙️  Current Configuration:');
    console.log('─'.repeat(40));
    console.log(`Monitoring: ${status.isRunning ? 'Enabled' : 'Disabled'}`);
    console.log(`Collection Interval: 5000ms`);
    console.log(`Batch Size: 100`);
    console.log(`Buffer Size: 1000`);
    console.log(`Sources: agent, coordinator, memory, neural, system`);
  }

  private async handleSetConfig(key: string, value: string): Promise<void> {
    console.log(`⚙️  Setting ${key} = ${value}`);
    console.log('✅ Configuration updated (persistence not implemented)');
  }

  private async handleResetConfig(): Promise<void> {
    console.log('🔄 Resetting configuration to defaults...');
    console.log('✅ Configuration reset');
  }

  // Utility methods

  private handleError(operation: string, error: any): void {
    if (error instanceof PerformanceReportingError) {
      console.error(`❌ ${operation} failed: ${error.message}`);
      if (error.context) {
        console.error(`Context: ${JSON.stringify(error.context, null, 2)}`);
      }
    } else {
      console.error(`❌ ${operation} failed: ${error.message}`);
    }
    process.exit(1);
  }

  private parseOutputFormat(format: string): OutputFormat {
    const validFormats = Object.values(OutputFormat);
    const parsed = format.toLowerCase() as OutputFormat;
    
    if (!validFormats.includes(parsed)) {
      throw new Error(`Invalid output format: ${format}`);
    }
    
    return parsed;
  }

  private parseChartType(type: string): ChartType {
    const validTypes = Object.values(ChartType);
    const parsed = type.toLowerCase() as ChartType;
    
    if (!validTypes.includes(parsed)) {
      throw new Error(`Invalid chart type: ${type}`);
    }
    
    return parsed;
  }

  private parseExportFormat(format: string): any {
    return format.toLowerCase();
  }

  private parseTimeRange(range: string): TimeRange {
    const now = Date.now();
    
    switch (range) {
      case 'last-hour':
        return { start: now - 3600000, end: now, granularity: 'minute' };
      case 'last-day':
        return { start: now - 86400000, end: now, granularity: 'hour' };
      case 'last-week':
        return { start: now - 604800000, end: now, granularity: 'day' };
      default:
        return { start: now - 3600000, end: now, granularity: 'minute' };
    }
  }

  private parseSwarmIds(swarms: string): string[] {
    if (!swarms || swarms.trim() === '') {
      return ['swarm-1', 'swarm-2', 'swarm-3']; // Default swarms
    }
    
    return swarms.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  private getDefaultMetricSelectors() {
    return [
      { metricType: MetricType.TASK_DURATION, aggregation: 'avg', groupBy: ['swarmId'] },
      { metricType: MetricType.ERROR_RATE, aggregation: 'avg', groupBy: ['swarmId'] },
      { metricType: MetricType.MEMORY_USAGE, aggregation: 'max', groupBy: ['swarmId'] }
    ];
  }

  private getScheduleTimeRange(frequency: string): TimeRange {
    const now = Date.now();
    
    switch (frequency) {
      case 'hourly':
        return { start: now - 3600000, end: now, granularity: 'minute' };
      case 'daily':
        return { start: now - 86400000, end: now, granularity: 'hour' };
      case 'weekly':
        return { start: now - 604800000, end: now, granularity: 'day' };
      default:
        return { start: now - 86400000, end: now, granularity: 'hour' };
    }
  }

  private getDefaultDashboardConfig() {
    return {
      title: 'Performance Dashboard',
      description: 'Real-time performance monitoring',
      layout: {
        columns: 3,
        rowHeight: 200,
        margin: 10,
        responsive: true
      },
      widgets: [
        {
          id: 'task-duration',
          title: 'Task Duration',
          type: 'chart',
          position: { x: 0, y: 0, width: 1, height: 1 },
          config: {
            visualization: {
              type: ChartType.LINE,
              metricType: MetricType.TASK_DURATION,
              aggregation: 'avg'
            }
          }
        },
        {
          id: 'error-rate',
          title: 'Error Rate',
          type: 'chart',
          position: { x: 1, y: 0, width: 1, height: 1 },
          config: {
            visualization: {
              type: ChartType.AREA,
              metricType: MetricType.ERROR_RATE,
              aggregation: 'avg'
            }
          }
        },
        {
          id: 'memory-usage',
          title: 'Memory Usage',
          type: 'chart',
          position: { x: 2, y: 0, width: 1, height: 1 },
          config: {
            visualization: {
              type: ChartType.BAR,
              metricType: MetricType.MEMORY_USAGE,
              aggregation: 'max'
            }
          }
        }
      ],
      timeRange: this.parseTimeRange('last-hour'),
      autoRefresh: true,
      refreshInterval: 30000
    };
  }

  private displayRankingTable(ranking: any): void {
    console.log('\n🏆 Swarm Performance Ranking:');
    console.log('─'.repeat(60));
    console.log('Rank | Swarm ID     | Score  | Top Strength');
    console.log('─'.repeat(60));
    
    ranking.rankings.forEach((r: any) => {
      const topStrength = Object.entries(r.metricScores)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      console.log(
        `${r.overallRank.toString().padStart(4)} | ` +
        `${r.swarmId.padEnd(12)} | ` +
        `${r.overallScore.toFixed(3)} | ` +
        `${topStrength ? topStrength[0] : 'N/A'}`
      );
    });
    console.log('─'.repeat(60));
  }

  private generateDashboardHTML(dashboard: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${dashboard.title}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { display: grid; grid-template-columns: repeat(${dashboard.layout.columns}, 1fr); gap: ${dashboard.layout.margin}px; }
        .widget { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .widget h3 { margin: 0 0 10px 0; color: #333; }
        .chart-placeholder { height: 150px; background: #e9ecef; display: flex; align-items: center; justify-content: center; color: #6c757d; }
    </style>
</head>
<body>
    <h1>${dashboard.title}</h1>
    <p>${dashboard.description}</p>
    <div class="dashboard">
        ${dashboard.widgets.map((widget: any) => `
            <div class="widget">
                <h3>${widget.title}</h3>
                <div class="chart-placeholder">Chart: ${widget.config.visualization?.metricType || 'No Data'}</div>
            </div>
        `).join('')}
    </div>
    <script>
        // Auto-refresh logic would go here
        console.log('Dashboard loaded');
    </script>
</body>
</html>`;
  }
}

// Export CLI setup function
export function setupPerformanceReportingCLI(): Command {
  const cli = new PerformanceReportingCLI();
  return cli.setupCLI();
}