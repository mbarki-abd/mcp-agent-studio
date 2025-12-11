/**
 * Simple Prometheus-compatible metrics collector
 * Provides counters, gauges, and histograms for observability
 */

interface MetricLabels {
  [key: string]: string;
}

interface CounterMetric {
  type: 'counter';
  help: string;
  values: Map<string, number>;
}

interface GaugeMetric {
  type: 'gauge';
  help: string;
  values: Map<string, number>;
}

interface HistogramMetric {
  type: 'histogram';
  help: string;
  buckets: number[];
  values: Map<string, { count: number; sum: number; buckets: number[] }>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private prefix: string;

  constructor(prefix: string = 'mcp_studio') {
    this.prefix = prefix;
    this.initDefaultMetrics();
  }

  private initDefaultMetrics() {
    // HTTP request metrics
    this.createCounter('http_requests_total', 'Total HTTP requests');
    this.createHistogram('http_request_duration_seconds', 'HTTP request duration', [
      0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ]);

    // MCP client metrics
    this.createCounter('mcp_connections_total', 'Total MCP connections attempted');
    this.createCounter('mcp_errors_total', 'Total MCP errors');
    this.createGauge('mcp_active_connections', 'Currently active MCP connections');

    // Task metrics
    this.createCounter('tasks_executed_total', 'Total tasks executed');
    this.createCounter('tasks_failed_total', 'Total tasks failed');
    this.createGauge('tasks_queued', 'Currently queued tasks');

    // Process metrics
    this.createGauge('process_memory_bytes', 'Process memory usage');
    this.createGauge('process_uptime_seconds', 'Process uptime');
  }

  createCounter(name: string, help: string) {
    const fullName = `${this.prefix}_${name}`;
    this.metrics.set(fullName, {
      type: 'counter',
      help,
      values: new Map(),
    });
  }

  createGauge(name: string, help: string) {
    const fullName = `${this.prefix}_${name}`;
    this.metrics.set(fullName, {
      type: 'gauge',
      help,
      values: new Map(),
    });
  }

  createHistogram(name: string, help: string, buckets: number[]) {
    const fullName = `${this.prefix}_${name}`;
    this.metrics.set(fullName, {
      type: 'histogram',
      help,
      buckets: buckets.sort((a, b) => a - b),
      values: new Map(),
    });
  }

  private labelsToString(labels: MetricLabels): string {
    if (Object.keys(labels).length === 0) return '';
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  increment(name: string, labels: MetricLabels = {}, value: number = 1) {
    const fullName = `${this.prefix}_${name}`;
    const metric = this.metrics.get(fullName);
    if (!metric || metric.type !== 'counter') return;

    const key = this.labelsToString(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  set(name: string, value: number, labels: MetricLabels = {}) {
    const fullName = `${this.prefix}_${name}`;
    const metric = this.metrics.get(fullName);
    if (!metric || metric.type !== 'gauge') return;

    const key = this.labelsToString(labels);
    metric.values.set(key, value);
  }

  observe(name: string, value: number, labels: MetricLabels = {}) {
    const fullName = `${this.prefix}_${name}`;
    const metric = this.metrics.get(fullName);
    if (!metric || metric.type !== 'histogram') return;

    const key = this.labelsToString(labels);
    let data = metric.values.get(key);
    if (!data) {
      data = { count: 0, sum: 0, buckets: metric.buckets.map(() => 0) };
      metric.values.set(key, data);
    }

    data.count++;
    data.sum += value;

    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        data.buckets[i]++;
      }
    }
  }

  // Update process metrics
  updateProcessMetrics() {
    const mem = process.memoryUsage();
    this.set('process_memory_bytes', mem.heapUsed, { type: 'heap_used' });
    this.set('process_memory_bytes', mem.heapTotal, { type: 'heap_total' });
    this.set('process_memory_bytes', mem.rss, { type: 'rss' });
    this.set('process_uptime_seconds', process.uptime());
  }

  // Export metrics in Prometheus format
  export(): string {
    this.updateProcessMetrics();

    const lines: string[] = [];

    for (const [name, metric] of this.metrics) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labels, value] of metric.values) {
          const labelStr = labels ? `{${labels}}` : '';
          lines.push(`${name}${labelStr} ${value}`);
        }
        // Add default 0 if no values
        if (metric.values.size === 0) {
          lines.push(`${name} 0`);
        }
      } else if (metric.type === 'histogram') {
        const histMetric = metric as HistogramMetric;
        for (const [labels, data] of histMetric.values) {
          const labelPrefix = labels ? `${labels},` : '';

          // Bucket values (cumulative)
          let cumulative = 0;
          for (let i = 0; i < histMetric.buckets.length; i++) {
            cumulative += data.buckets[i];
            lines.push(`${name}_bucket{${labelPrefix}le="${histMetric.buckets[i]}"} ${cumulative}`);
          }
          lines.push(`${name}_bucket{${labelPrefix}le="+Inf"} ${data.count}`);
          lines.push(`${name}_sum{${labels}} ${data.sum}`);
          lines.push(`${name}_count{${labels}} ${data.count}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Helper for timing requests
export function timeRequest(durationMs: number, labels: MetricLabels = {}) {
  metrics.observe('http_request_duration_seconds', durationMs / 1000, labels);
  metrics.increment('http_requests_total', labels);
}
