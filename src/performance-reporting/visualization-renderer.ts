/**
 * Claude-Flow Performance Reporting System - Visualization Renderer
 * Responsible for creating charts, graphs, and visual representations of performance data
 */

import {
  IVisualizationRenderer,
  VisualizationConfig,
  ChartData,
  Visualization,
  Dashboard,
  DashboardConfig,
  ChartType,
  ExportFormat,
  ChartConfig,
  ChartDataset,
  DashboardWidget,
  VisualizationMetadata,
  PerformanceReportingError,
  ErrorCode,
  MetricType
} from './interfaces.js';

export class VisualizationRenderer implements IVisualizationRenderer {
  private readonly chartDefaults = {
    responsive: true,
    animation: true,
    legend: true
  };

  private readonly colorSchemes = {
    default: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
    performance: ['#2ecc71', '#f39c12', '#e74c3c'], // Green, Orange, Red
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
  };

  async renderChart(config: VisualizationConfig, data: ChartData): Promise<Visualization> {
    try {
      const startTime = Date.now();
      
      // Validate configuration and data
      this.validateVisualizationConfig(config);
      this.validateChartData(data);

      // Process and enhance data
      const processedData = await this.processChartData(data, config);
      
      // Generate chart configuration
      const chartConfig = this.generateChartConfig(config, processedData);
      
      // Create visualization metadata
      const metadata: VisualizationMetadata = {
        createdAt: Date.now(),
        dataRange: config.timeRange || { start: Date.now() - 86400000, end: Date.now(), granularity: 'hour' },
        metricTypes: [config.metricType],
        swarmIds: this.extractSwarmIds(processedData),
        renderTime: Date.now() - startTime
      };

      const visualization: Visualization = {
        id: this.generateVisualizationId(),
        type: config.type,
        title: this.generateTitle(config),
        description: this.generateDescription(config),
        data: processedData,
        config: chartConfig,
        metadata
      };

      console.log(`📊 Chart rendered: ${config.type} for ${config.metricType} in ${metadata.renderTime}ms`);
      return visualization;

    } catch (error) {
      throw new PerformanceReportingError(
        `Chart rendering failed: ${error.message}`,
        ErrorCode.VISUALIZATION_RENDERING_FAILED,
        'VisualizationRenderer',
        { type: config.type, metricType: config.metricType, error: error.message }
      );
    }
  }

  async renderDashboard(config: DashboardConfig, data: Record<string, any>): Promise<Dashboard> {
    try {
      const startTime = Date.now();

      // Validate dashboard configuration
      this.validateDashboardConfig(config);

      // Render widgets
      const widgets: DashboardWidget[] = [];
      
      for (const widget of config.widgets) {
        const renderedWidget = await this.renderWidget(widget, data);
        widgets.push(renderedWidget);
      }

      const dashboard: Dashboard = {
        id: this.generateDashboardId(),
        title: config.title,
        description: config.description,
        layout: config.layout,
        widgets,
        refreshInterval: config.refreshInterval,
        autoRefresh: config.autoRefresh
      };

      console.log(`📈 Dashboard rendered with ${widgets.length} widgets in ${Date.now() - startTime}ms`);
      return dashboard;

    } catch (error) {
      throw new PerformanceReportingError(
        `Dashboard rendering failed: ${error.message}`,
        ErrorCode.VISUALIZATION_RENDERING_FAILED,
        'VisualizationRenderer',
        { dashboard: config.title, error: error.message }
      );
    }
  }

  async exportVisualization(viz: Visualization, format: ExportFormat): Promise<Buffer> {
    try {
      switch (format) {
        case ExportFormat.PNG:
          return this.exportToPNG(viz);
        case ExportFormat.SVG:
          return this.exportToSVG(viz);
        case ExportFormat.PDF:
          return this.exportToPDF(viz);
        case ExportFormat.JPEG:
          return this.exportToJPEG(viz);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new PerformanceReportingError(
        `Visualization export failed: ${error.message}`,
        ErrorCode.VISUALIZATION_RENDERING_FAILED,
        'VisualizationRenderer',
        { vizId: viz.id, format, error: error.message }
      );
    }
  }

  async generateThumbnail(viz: Visualization): Promise<Buffer> {
    // Generate a small PNG thumbnail (128x96)
    return this.exportToPNG(viz, { width: 128, height: 96 });
  }

  // Private methods

  private validateVisualizationConfig(config: VisualizationConfig): void {
    if (!config.type || !Object.values(ChartType).includes(config.type)) {
      throw new Error(`Invalid chart type: ${config.type}`);
    }
    
    if (!config.metricType || !Object.values(MetricType).includes(config.metricType)) {
      throw new Error(`Invalid metric type: ${config.metricType}`);
    }
  }

  private validateChartData(data: ChartData): void {
    if (!data.labels || !Array.isArray(data.labels)) {
      throw new Error('Chart data must include labels array');
    }
    
    if (!data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
      throw new Error('Chart data must include at least one dataset');
    }
  }

  private validateDashboardConfig(config: DashboardConfig): void {
    if (!config.title || !config.widgets || config.widgets.length === 0) {
      throw new Error('Dashboard must have a title and at least one widget');
    }

    if (!config.layout) {
      throw new Error('Dashboard layout configuration is required');
    }
  }

  private async processChartData(data: ChartData, config: VisualizationConfig): Promise<ChartData> {
    const processedData: ChartData = {
      labels: [...data.labels],
      datasets: [],
      annotations: data.annotations ? [...data.annotations] : []
    };

    // Process datasets with styling
    for (let i = 0; i < data.datasets.length; i++) {
      const dataset = data.datasets[i];
      const processedDataset = await this.processDataset(dataset, config, i);
      processedData.datasets.push(processedDataset);
    }

    // Apply filters if configured
    if (config.filters && config.filters.length > 0) {
      return this.applyDataFilters(processedData, config.filters);
    }

    return processedData;
  }

  private async processDataset(dataset: ChartDataset, config: VisualizationConfig, index: number): Promise<ChartDataset> {
    const colorScheme = config.styling?.colorScheme || 'default';
    const colors = this.colorSchemes[colorScheme] || this.colorSchemes.default;
    
    const processedDataset: ChartDataset = {
      ...dataset,
      backgroundColor: this.generateColors(colors[index % colors.length], config.type, 'background'),
      borderColor: this.generateColors(colors[index % colors.length], config.type, 'border'),
      borderWidth: config.type === ChartType.LINE ? 2 : 1,
      fill: config.type === ChartType.AREA,
      tension: config.type === ChartType.LINE ? 0.1 : undefined
    };

    // Apply data transformations based on aggregation
    if (config.aggregation) {
      processedDataset.data = this.applyAggregation(dataset.data as number[], config.aggregation);
    }

    return processedDataset;
  }

  private generateChartConfig(config: VisualizationConfig, data: ChartData): ChartConfig {
    const chartConfig: ChartConfig = {
      ...this.chartDefaults,
      scales: this.generateScaleConfig(config),
      plugins: this.generatePluginConfig(config),
      interaction: {
        mode: 'index',
        intersect: false
      }
    };

    // Chart-specific configurations
    switch (config.type) {
      case ChartType.LINE:
      case ChartType.AREA:
        chartConfig.scales!.x!.type = 'time';
        chartConfig.plugins!.tooltip = true;
        break;
      case ChartType.BAR:
        chartConfig.scales!.y!.grid = true;
        break;
      case ChartType.PIE:
        chartConfig.scales = undefined; // Pie charts don't use scales
        break;
      case ChartType.SCATTER:
        chartConfig.scales!.x!.type = 'linear';
        chartConfig.scales!.y!.type = 'linear';
        break;
    }

    return chartConfig;
  }

  private generateScaleConfig(config: VisualizationConfig) {
    return {
      x: {
        type: 'category' as const,
        title: config.metricType.includes('time') ? 'Time' : 'Categories',
        grid: false
      },
      y: {
        type: 'linear' as const,
        title: this.getMetricUnit(config.metricType),
        grid: true,
        min: this.getMetricMinValue(config.metricType),
        max: undefined // Let Chart.js auto-scale
      }
    };
  }

  private generatePluginConfig(config: VisualizationConfig) {
    return {
      tooltip: true,
      zoom: config.type !== ChartType.PIE,
      pan: config.type === ChartType.LINE || config.type === ChartType.AREA
    };
  }

  private generateColors(baseColor: string, chartType: ChartType, colorType: 'background' | 'border'): string | string[] {
    switch (chartType) {
      case ChartType.PIE:
        return this.colorSchemes.default;
      case ChartType.BAR:
        return colorType === 'background' ? this.addAlpha(baseColor, 0.8) : baseColor;
      case ChartType.LINE:
      case ChartType.AREA:
        return colorType === 'background' ? this.addAlpha(baseColor, 0.2) : baseColor;
      default:
        return baseColor;
    }
  }

  private addAlpha(color: string, alpha: number): string {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private applyAggregation(data: number[], aggregation: string): number[] {
    // Simple aggregation implementation
    // In practice, this would be more sophisticated
    switch (aggregation) {
      case 'avg':
        const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
        return data.map(() => avg);
      case 'sum':
        return data.map((_, i, arr) => arr.slice(0, i + 1).reduce((sum, val) => sum + val, 0));
      case 'max':
        return data.map((_, i, arr) => Math.max(...arr.slice(0, i + 1)));
      case 'min':
        return data.map((_, i, arr) => Math.min(...arr.slice(0, i + 1)));
      default:
        return data;
    }
  }

  private applyDataFilters(data: ChartData, filters: any[]): ChartData {
    // Apply filters to data
    // This is a simplified implementation
    let filteredData = { ...data };
    
    for (const filter of filters) {
      if (filter.field === 'value' && filter.operator === 'gt') {
        filteredData.datasets = filteredData.datasets.map(dataset => ({
          ...dataset,
          data: (dataset.data as number[]).filter(val => val > filter.value)
        }));
      }
    }
    
    return filteredData;
  }

  private async renderWidget(widget: DashboardWidget, data: Record<string, any>): Promise<DashboardWidget> {
    const renderedWidget = { ...widget };
    
    if (widget.type === 'chart' && widget.config.visualization) {
      // Render chart visualization for widget
      const chartData = this.extractWidgetData(data, widget);
      const visualization = await this.renderChart(widget.config.visualization, chartData);
      renderedWidget.data = visualization;
    }
    
    return renderedWidget;
  }

  private extractWidgetData(data: Record<string, any>, widget: DashboardWidget): ChartData {
    // Extract relevant data for the widget
    // This is a simplified implementation
    const widgetData = data[widget.id] || data[widget.config.visualization?.metricType || ''];
    
    if (!widgetData) {
      return {
        labels: [],
        datasets: [{
          label: 'No Data',
          data: [],
          backgroundColor: '#cccccc'
        }]
      };
    }
    
    return widgetData;
  }

  private extractSwarmIds(data: ChartData): string[] {
    // Extract swarm IDs from dataset labels
    return data.datasets.map(dataset => dataset.label || 'Unknown');
  }

  private generateTitle(config: VisualizationConfig): string {
    const metricName = this.formatMetricName(config.metricType);
    const chartTypeName = config.type.charAt(0).toUpperCase() + config.type.slice(1);
    return `${metricName} - ${chartTypeName} Chart`;
  }

  private generateDescription(config: VisualizationConfig): string {
    const metricName = this.formatMetricName(config.metricType);
    return `${config.type} visualization showing ${metricName} over time`;
  }

  private formatMetricName(metricType: MetricType): string {
    return metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getMetricUnit(metricType: MetricType): string {
    const units = {
      [MetricType.TASK_DURATION]: 'Duration (ms)',
      [MetricType.MEMORY_USAGE]: 'Memory (%)',
      [MetricType.CPU_USAGE]: 'CPU (%)',
      [MetricType.ERROR_RATE]: 'Error Rate (%)',
      [MetricType.THROUGHPUT]: 'Throughput (ops/sec)',
      [MetricType.NETWORK_LATENCY]: 'Latency (ms)',
      [MetricType.TOKEN_USAGE]: 'Tokens',
      [MetricType.RESPONSE_TIME]: 'Response Time (ms)',
      [MetricType.CONCURRENT_AGENTS]: 'Agent Count'
    };
    
    return units[metricType] || 'Value';
  }

  private getMetricMinValue(metricType: MetricType): number | undefined {
    // Set minimum values for certain metrics
    switch (metricType) {
      case MetricType.ERROR_RATE:
      case MetricType.MEMORY_USAGE:
      case MetricType.CPU_USAGE:
        return 0;
      default:
        return undefined;
    }
  }

  private async exportToPNG(viz: Visualization, dimensions?: { width: number; height: number }): Promise<Buffer> {
    // In a real implementation, this would use a headless browser or canvas library
    // to render the chart and export as PNG
    const width = dimensions?.width || 800;
    const height = dimensions?.height || 600;
    
    // Placeholder implementation
    const svgContent = this.generateSVGChart(viz, width, height);
    return Buffer.from(svgContent, 'utf8');
  }

  private async exportToSVG(viz: Visualization): Promise<Buffer> {
    const svgContent = this.generateSVGChart(viz, 800, 600);
    return Buffer.from(svgContent, 'utf8');
  }

  private async exportToPDF(viz: Visualization): Promise<Buffer> {
    // PDF export would require libraries like puppeteer or jsPDF
    throw new Error('PDF export not implemented yet');
  }

  private async exportToJPEG(viz: Visualization): Promise<Buffer> {
    // Similar to PNG but with JPEG compression
    const svgContent = this.generateSVGChart(viz, 800, 600);
    return Buffer.from(svgContent, 'utf8');
  }

  private generateSVGChart(viz: Visualization, width: number, height: number): string {
    // Simple SVG chart generation for demonstration
    // In practice, this would use a proper charting library
    
    const { data, type, title } = viz;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<title>${title}</title>`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    
    // Add title
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>`;
    
    if (type === ChartType.BAR && data.datasets.length > 0) {
      // Simple bar chart
      const dataset = data.datasets[0];
      const values = dataset.data as number[];
      const maxValue = Math.max(...values);
      const barWidth = (width - 100) / values.length;
      const chartHeight = height - 100;
      
      values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = 50 + index * barWidth;
        const y = height - 50 - barHeight;
        
        svg += `<rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" fill="${this.colorSchemes.default[index % this.colorSchemes.default.length]}"/>`;
        svg += `<text x="${x + barWidth * 0.4}" y="${height - 30}" text-anchor="middle" font-size="10">${data.labels[index] || index}</text>`;
      });
    } else if (type === ChartType.LINE && data.datasets.length > 0) {
      // Simple line chart
      const dataset = data.datasets[0];
      const values = dataset.data as number[];
      const maxValue = Math.max(...values);
      const stepWidth = (width - 100) / (values.length - 1);
      const chartHeight = height - 100;
      
      let path = 'M';
      values.forEach((value, index) => {
        const x = 50 + index * stepWidth;
        const y = height - 50 - (value / maxValue) * chartHeight;
        path += `${index === 0 ? '' : 'L'}${x},${y}`;
      });
      
      svg += `<path d="${path}" stroke="${this.colorSchemes.default[0]}" stroke-width="2" fill="none"/>`;
    }
    
    svg += '</svg>';
    return svg;
  }

  private generateVisualizationId(): string {
    return `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}