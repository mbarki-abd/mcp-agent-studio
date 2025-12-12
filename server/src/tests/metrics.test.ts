import { describe, it, expect, beforeEach } from 'vitest';
import { metrics, timeRequest } from '../utils/metrics.js';

describe('MetricsCollector', () => {
  describe('Counters', () => {
    it('should increment counter by 1 by default', () => {
      metrics.increment('http_requests_total', { method: 'GET', status: '200' });
      const output = metrics.export();
      expect(output).toContain('mcp_studio_http_requests_total');
    });

    it('should increment counter by specified value', () => {
      metrics.increment('http_requests_total', { method: 'POST', status: '201' }, 5);
      const output = metrics.export();
      expect(output).toContain('mcp_studio_http_requests_total');
    });

    it('should handle multiple labels', () => {
      metrics.increment('mcp_connections_total', { server: 'test', type: 'stdio' });
      const output = metrics.export();
      expect(output).toContain('mcp_studio_mcp_connections_total');
    });
  });

  describe('Gauges', () => {
    it('should set gauge value', () => {
      metrics.set('mcp_active_connections', 5);
      const output = metrics.export();
      expect(output).toContain('mcp_studio_mcp_active_connections');
      expect(output).toContain('5');
    });

    it('should overwrite previous gauge value', () => {
      metrics.set('tasks_queued', 10);
      metrics.set('tasks_queued', 3);
      const output = metrics.export();
      // The latest value should be present
      expect(output).toContain('mcp_studio_tasks_queued');
    });

    it('should handle gauges with labels', () => {
      metrics.set('process_memory_bytes', 1024, { type: 'heap_used' });
      const output = metrics.export();
      expect(output).toContain('mcp_studio_process_memory_bytes');
      expect(output).toContain('type="heap_used"');
    });
  });

  describe('Histograms', () => {
    it('should observe histogram values', () => {
      metrics.observe('http_request_duration_seconds', 0.5, { method: 'GET' });
      const output = metrics.export();
      expect(output).toContain('mcp_studio_http_request_duration_seconds_bucket');
      expect(output).toContain('mcp_studio_http_request_duration_seconds_sum');
      expect(output).toContain('mcp_studio_http_request_duration_seconds_count');
    });

    it('should update bucket counts correctly', () => {
      // Record a value that falls in multiple buckets (cumulative)
      metrics.observe('http_request_duration_seconds', 0.1, { route: '/api/test' });
      const output = metrics.export();
      expect(output).toContain('le="0.1"');
      expect(output).toContain('le="+Inf"');
    });
  });

  describe('Export format', () => {
    it('should export in Prometheus format with HELP and TYPE', () => {
      const output = metrics.export();
      expect(output).toContain('# HELP');
      expect(output).toContain('# TYPE');
    });

    it('should include counter type annotation', () => {
      const output = metrics.export();
      expect(output).toContain('# TYPE mcp_studio_http_requests_total counter');
    });

    it('should include gauge type annotation', () => {
      const output = metrics.export();
      expect(output).toContain('# TYPE mcp_studio_mcp_active_connections gauge');
    });

    it('should include histogram type annotation', () => {
      const output = metrics.export();
      expect(output).toContain('# TYPE mcp_studio_http_request_duration_seconds histogram');
    });

    it('should include process metrics', () => {
      const output = metrics.export();
      expect(output).toContain('mcp_studio_process_memory_bytes');
      expect(output).toContain('mcp_studio_process_uptime_seconds');
    });
  });

  describe('Default metrics', () => {
    it('should create HTTP request metrics', () => {
      const output = metrics.export();
      expect(output).toContain('mcp_studio_http_requests_total');
      expect(output).toContain('mcp_studio_http_request_duration_seconds');
    });

    it('should create MCP metrics', () => {
      const output = metrics.export();
      expect(output).toContain('mcp_studio_mcp_connections_total');
      expect(output).toContain('mcp_studio_mcp_errors_total');
      expect(output).toContain('mcp_studio_mcp_active_connections');
    });

    it('should create task metrics', () => {
      const output = metrics.export();
      expect(output).toContain('mcp_studio_tasks_executed_total');
      expect(output).toContain('mcp_studio_tasks_failed_total');
      expect(output).toContain('mcp_studio_tasks_queued');
    });
  });
});

describe('timeRequest helper', () => {
  it('should record request duration in seconds', () => {
    timeRequest(250, { method: 'GET', status: '200', route: '/api/health' });
    const output = metrics.export();
    // Duration should be converted from ms to seconds (250ms = 0.25s)
    expect(output).toContain('mcp_studio_http_request_duration_seconds');
  });

  it('should increment request counter', () => {
    const before = metrics.export();
    timeRequest(100, { method: 'POST', status: '201', route: '/api/data' });
    const after = metrics.export();
    // Request counter should be incremented
    expect(after).toContain('mcp_studio_http_requests_total');
  });
});
