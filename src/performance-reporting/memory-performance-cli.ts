#!/usr/bin/env node

/**
 * Memory-Aware Performance Reporting CLI
 * Command-line interface for claude-flow analysis with Marley integration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { EnhancedPerformanceCollector } from './enhanced-collector.js';
import { MemoryPerformanceDashboard } from './memory-performance-dashboard.js';
import { ReportGenerator } from './report-generator.js';
import path from 'path';
import fs from 'fs/promises';

const program = new Command();

interface CLIConfig {
  marleyEndpoint: string;
  outputDir: string;
  format: 'json' | 'html' | 'markdown';
  includeMemory: boolean;
  enableRealTime: boolean;
  verbose: boolean;
}

class MemoryPerformanceCLI {
  private config: CLIConfig;
  private collector: EnhancedPerformanceCollector | null = null;
  private dashboard: MemoryPerformanceDashboard | null = null;

  constructor(config: CLIConfig) {
    this.config = config;
  }

  async initializeCollector(): Promise<void> {
    const spinner = ora('Initializing performance collector with Marley integration').start();
    
    try {
      this.collector = new EnhancedPerformanceCollector({
        collectionInterval: 5000,
        bufferSize: 1000,
        enableRealTime: this.config.enableRealTime,
        samplingStrategy: 'adaptive',
        marleyEndpoint: this.config.marleyEndpoint,
        enableMemoryMetrics: this.config.includeMemory,
        spectralAnalysisInterval: 30000,
        memoryHealthCheckInterval: 15000
      });

      await this.collector.startCollection();
      
      spinner.succeed(chalk.green('Performance collector initialized successfully'));
      
      if (this.config.includeMemory) {
        const memoryStatus = this.collector.getMemoryBridgeStatus();
        if (memoryStatus.connected) {
          console.log(chalk.blue('🌀 Connected to Marley Memory Bridge'));
        } else {
          console.log(chalk.yellow('⚠️  Marley Memory Bridge not connected'));
        }
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize collector'));
      throw error;
    }
  }

  async generateReport(): Promise<void> {
    if (!this.collector) {
      await this.initializeCollector();
    }

    const spinner = ora('Generating performance report').start();
    
    try {
      // Collect metrics for a short period
      spinner.text = 'Collecting performance metrics...';
      await this.waitForMetrics(10000); // Wait 10 seconds
      
      const summary = this.collector!.getPerformanceSummary();
      const reportGenerator = new ReportGenerator({
        outputFormats: [this.config.format],
        enableVisualization: true,
        templatePath: path.join(__dirname, '../templates')
      });

      spinner.text = 'Generating report...';
      const reportData = {
        timestamp: Date.now(),
        summary,
        metrics: this.collector!.getMetrics(),
        memoryStatus: this.config.includeMemory ? this.collector!.getMemoryBridgeStatus() : null
      };

      const report = await reportGenerator.generateReport({
        data: reportData,
        format: this.config.format,
        includeCharts: true,
        template: this.config.includeMemory ? 'memory-performance' : 'standard-performance'
      });

      // Save report
      const filename = `performance-report-${Date.now()}.${this.config.format}`;
      const filepath = path.join(this.config.outputDir, filename);
      
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.writeFile(filepath, typeof report.content === 'string' ? report.content : JSON.stringify(report, null, 2));
      
      spinner.succeed(chalk.green(`Report generated: ${filepath}`));
      
      // Display summary
      this.displaySummary(summary);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate report'));
      throw error;
    } finally {
      if (this.collector) {
        await this.collector.stopCollection();
      }
    }
  }

  async startDashboard(port: number = 3333): Promise<void> {
    const spinner = ora(`Starting live dashboard on port ${port}`).start();
    
    try {
      this.dashboard = new MemoryPerformanceDashboard({
        port,
        enableWebSocket: true,
        updateInterval: 5000,
        marleyEndpoint: this.config.marleyEndpoint,
        enableCORS: true
      });

      await this.dashboard.start();
      
      spinner.succeed(chalk.green(`Dashboard started at http://localhost:${port}`));
      console.log(chalk.blue('Press Ctrl+C to stop the dashboard'));
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n⏹️  Stopping dashboard...'));
        if (this.dashboard) {
          await this.dashboard.stop();
        }
        process.exit(0);
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to start dashboard'));
      throw error;
    }
  }

  async monitorLive(): Promise<void> {
    if (!this.collector) {
      await this.initializeCollector();
    }

    console.log(chalk.blue('🔴 Starting live monitoring (Press Ctrl+C to stop)'));
    console.log(chalk.gray('=' .repeat(80)));

    const displayInterval = setInterval(() => {
      this.displayLiveMetrics();
    }, 2000);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      clearInterval(displayInterval);
      console.log(chalk.yellow('\n⏹️  Stopping live monitoring...'));
      if (this.collector) {
        await this.collector.stopCollection();
      }
      process.exit(0);
    });
  }

  private displayLiveMetrics(): void {
    if (!this.collector) return;

    const summary = this.collector.getPerformanceSummary();
    const memoryStatus = this.collector.getMemoryBridgeStatus();
    
    // Clear screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');
    
    console.log(chalk.blue.bold('🌀 HiveSwarm Live Performance Monitor'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`));
    console.log();

    // Memory Bridge Status
    if (this.config.includeMemory) {
      const statusColor = memoryStatus.connected ? chalk.green : chalk.red;
      const statusText = memoryStatus.connected ? '🟢 Connected' : '🔴 Disconnected';
      console.log(`${chalk.bold('Marley Memory Bridge:')} ${statusColor(statusText)}`);
      
      if (memoryStatus.connected && memoryStatus.health) {
        console.log(`  Messages: ${memoryStatus.health.messagesSent}↑ ${memoryStatus.health.messagesReceived}↓`);
        console.log(`  Errors: ${memoryStatus.health.errorsCount}`);
        console.log(`  Metrics: ${memoryStatus.metrics}`);
      }
      console.log();
    }

    // Metrics Overview
    const metricsTable = new Table({
      head: ['Metric', 'Value', 'Status'],
      style: { head: ['cyan'] }
    });

    metricsTable.push(
      ['Total Metrics', summary.totalMetrics.toString(), '📊'],
      ['Memory Metrics', summary.memoryMetrics.toString(), '🧠'],
      ['System Metrics', summary.systemMetrics.toString(), '⚙️'],
      ['Neural Metrics', summary.neuralMetrics.toString(), '🧠'],
      ['Avg Memory Usage', `${(summary.averages.memoryUsage / 1024 / 1024).toFixed(2)} MB`, '💾'],
      ['Avg Processing Time', `${summary.averages.processingTime.toFixed(2)} ms`, '⏱️']
    );

    console.log(metricsTable.toString());
    console.log();

    // Recent Activity
    const recentMetrics = this.collector.getMetrics().slice(-5);
    if (recentMetrics.length > 0) {
      console.log(chalk.bold('Recent Activity:'));
      recentMetrics.forEach(metric => {
        const time = new Date(metric.timestamp).toLocaleTimeString();
        const typeIcon = this.getMetricIcon(metric.type);
        console.log(`  ${typeIcon} ${time} - ${metric.type}: ${metric.value}${metric.unit}`);
      });
      console.log();
    }

    console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
  }

  private getMetricIcon(metricType: string): string {
    const icons: Record<string, string> = {
      'MEMORY_USAGE': '💾',
      'CPU_USAGE': '⚡',
      'MEMORY_SYNC_DURATION': '🔄',
      'NEURAL_PROCESSING_TIME': '🧠',
      'HARMONIZATION_QUALITY': '✨',
      'CACHE_PERFORMANCE': '📈',
      'SYSTEM_HEALTH': '❤️',
      'EXTERNAL_SERVICE_LATENCY': '🌐'
    };
    return icons[metricType] || '📊';
  }

  private displaySummary(summary: any): void {
    console.log(chalk.blue.bold('\n📊 Performance Summary'));
    console.log(chalk.gray('=' .repeat(50)));

    const summaryTable = new Table({
      style: { head: ['cyan'] }
    });

    summaryTable.push(
      ['Total Metrics Collected', summary.totalMetrics],
      ['Memory Metrics', summary.memoryMetrics],
      ['System Metrics', summary.systemMetrics],
      ['Neural Metrics', summary.neuralMetrics],
      ['Time Range', `${new Date(summary.timeRange.start).toLocaleString()} - ${new Date(summary.timeRange.end).toLocaleString()}`],
      ['Average Memory Usage', `${(summary.averages.memoryUsage / 1024 / 1024).toFixed(2)} MB`],
      ['Average Processing Time', `${summary.averages.processingTime.toFixed(2)} ms`]
    );

    if (summary.averages.spectralFrequency > 0) {
      summaryTable.push(['Average Spectral Frequency', summary.averages.spectralFrequency.toFixed(4)]);
    }

    console.log(summaryTable.toString());

    if (this.config.includeMemory && summary.marleyBridge) {
      console.log(chalk.blue.bold('\n🌀 Marley Memory Bridge Status'));
      console.log(chalk.gray('=' .repeat(50)));
      
      const bridgeTable = new Table({
        style: { head: ['cyan'] }
      });

      bridgeTable.push(
        ['Connection Status', summary.marleyBridge.connected ? '🟢 Connected' : '🔴 Disconnected'],
        ['Metrics Collected', summary.marleyBridge.metrics || 'N/A']
      );

      if (summary.marleyBridge.health) {
        bridgeTable.push(
          ['Messages Sent', summary.marleyBridge.health.messagesSent],
          ['Messages Received', summary.marleyBridge.health.messagesReceived],
          ['Errors', summary.marleyBridge.health.errorsCount]
        );
      }

      console.log(bridgeTable.toString());
    }
  }

  private async waitForMetrics(duration: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

  async syncMemory(): Promise<void> {
    if (!this.collector) {
      await this.initializeCollector();
    }

    const spinner = ora('Requesting memory synchronization').start();
    
    try {
      await this.collector!.requestMemorySync();
      
      // Wait a bit for the sync to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = this.collector!.getMemoryBridgeStatus();
      
      spinner.succeed(chalk.green('Memory sync completed'));
      
      console.log(chalk.blue(`📊 Metrics collected: ${status.metrics}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Memory sync failed'));
      throw error;
    } finally {
      if (this.collector) {
        await this.collector.stopCollection();
      }
    }
  }

  async testConnection(): Promise<void> {
    const spinner = ora(`Testing connection to ${this.config.marleyEndpoint}`).start();
    
    try {
      const collector = new EnhancedPerformanceCollector({
        collectionInterval: 5000,
        bufferSize: 100,
        enableRealTime: false,
        samplingStrategy: 'uniform',
        marleyEndpoint: this.config.marleyEndpoint,
        enableMemoryMetrics: true,
        spectralAnalysisInterval: 30000,
        memoryHealthCheckInterval: 15000
      });

      await collector.startCollection();
      
      // Test for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = collector.getMemoryBridgeStatus();
      
      await collector.stopCollection();
      
      if (status.connected) {
        spinner.succeed(chalk.green('✅ Connection successful'));
        console.log(chalk.blue(`Health: ${JSON.stringify(status.health, null, 2)}`));
      } else {
        spinner.fail(chalk.red('❌ Connection failed'));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Connection test failed'));
      console.error(error);
    }
  }
}

// CLI Configuration
program
  .name('claude-flow-performance')
  .description('Memory-aware performance reporting for claude-flow swarm operations')
  .version('2.0.0');

// Global options
program
  .option('--marley-endpoint <url>', 'Marley memory bridge WebSocket endpoint', 'ws://localhost:8080/ws/memory-sync')
  .option('--output-dir <path>', 'Output directory for reports', './reports')
  .option('--format <type>', 'Report format (json|html|markdown)', 'html')
  .option('--include-memory', 'Include memory synchronization metrics', true)
  .option('--verbose', 'Enable verbose logging', false);

// Commands
program
  .command('report')
  .description('Generate comprehensive performance report')
  .option('--format <type>', 'Override global format setting')
  .action(async (options) => {
    const config: CLIConfig = {
      marleyEndpoint: program.opts().marleyEndpoint,
      outputDir: program.opts().outputDir,
      format: options.format || program.opts().format,
      includeMemory: program.opts().includeMemory,
      enableRealTime: false,
      verbose: program.opts().verbose
    };

    const cli = new MemoryPerformanceCLI(config);
    
    try {
      await cli.generateReport();
    } catch (error) {
      console.error(chalk.red('Error generating report:'), error.message);
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Start live performance dashboard')
  .option('--port <number>', 'Dashboard port', '3333')
  .action(async (options) => {
    const config: CLIConfig = {
      marleyEndpoint: program.opts().marleyEndpoint,
      outputDir: program.opts().outputDir,
      format: program.opts().format,
      includeMemory: program.opts().includeMemory,
      enableRealTime: true,
      verbose: program.opts().verbose
    };

    const cli = new MemoryPerformanceCLI(config);
    
    try {
      await cli.startDashboard(parseInt(options.port));
    } catch (error) {
      console.error(chalk.red('Error starting dashboard:'), error.message);
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Live performance monitoring in terminal')
  .action(async () => {
    const config: CLIConfig = {
      marleyEndpoint: program.opts().marleyEndpoint,
      outputDir: program.opts().outputDir,
      format: program.opts().format,
      includeMemory: program.opts().includeMemory,
      enableRealTime: true,
      verbose: program.opts().verbose
    };

    const cli = new MemoryPerformanceCLI(config);
    
    try {
      await cli.monitorLive();
    } catch (error) {
      console.error(chalk.red('Error in live monitoring:'), error.message);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Request manual memory synchronization')
  .action(async () => {
    const config: CLIConfig = {
      marleyEndpoint: program.opts().marleyEndpoint,
      outputDir: program.opts().outputDir,
      format: program.opts().format,
      includeMemory: true,
      enableRealTime: false,
      verbose: program.opts().verbose
    };

    const cli = new MemoryPerformanceCLI(config);
    
    try {
      await cli.syncMemory();
    } catch (error) {
      console.error(chalk.red('Error syncing memory:'), error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test connection to Marley memory bridge')
  .action(async () => {
    const config: CLIConfig = {
      marleyEndpoint: program.opts().marleyEndpoint,
      outputDir: program.opts().outputDir,
      format: program.opts().format,
      includeMemory: true,
      enableRealTime: false,
      verbose: program.opts().verbose
    };

    const cli = new MemoryPerformanceCLI(config);
    
    try {
      await cli.testConnection();
    } catch (error) {
      console.error(chalk.red('Connection test failed:'), error.message);
      process.exit(1);
    }
  });

// Add example usage
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ npx claude-flow analysis performance-report --format html --include-memory');
  console.log('  $ npx claude-flow analysis performance-dashboard --port 3333');
  console.log('  $ npx claude-flow analysis performance-monitor');
  console.log('  $ npx claude-flow analysis performance-sync');
  console.log('  $ npx claude-flow analysis performance-test');
  console.log('');
  console.log('For more information about Marley integration:');
  console.log('  https://github.com/ruvnet/claude-flow');
});

// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { MemoryPerformanceCLI, program };
export default program;