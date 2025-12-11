import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExecutionStream } from '../../../core/websocket/WebSocketProvider';
import type { ExecutionStreamEvent } from '@mcp/types';

interface DataPoint {
  time: string;
  timestamp: number;
  completed: number;
  failed: number;
  running: number;
}

interface ExecutionMetricsChartProps {
  maxDataPoints?: number;
  className?: string;
}

export function ExecutionMetricsChart({
  maxDataPoints = 60,
  className,
}: ExecutionMetricsChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [metrics, setMetrics] = useState({
    completed: 0,
    failed: 0,
    running: 0,
  });

  // Initialize with empty data
  useEffect(() => {
    const now = Date.now();
    const initialData: DataPoint[] = [];

    for (let i = maxDataPoints; i >= 0; i--) {
      const timestamp = now - i * 1000;
      initialData.push({
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        timestamp,
        completed: 0,
        failed: 0,
        running: 0,
      });
    }

    setData(initialData);
  }, [maxDataPoints]);

  // Handle execution events
  const handleExecutionEvent = useCallback((event: ExecutionStreamEvent) => {
    const { phase } = event.data;

    setMetrics((prev) => {
      const newMetrics = { ...prev };

      if (phase === 'running' || phase === 'starting') {
        newMetrics.running = Math.max(0, prev.running) + 1;
      } else if (phase === 'completed') {
        newMetrics.running = Math.max(0, prev.running - 1);
        newMetrics.completed = prev.completed + 1;
      } else if (phase === 'failed') {
        newMetrics.running = Math.max(0, prev.running - 1);
        newMetrics.failed = prev.failed + 1;
      }

      return newMetrics;
    });
  }, []);

  useExecutionStream(handleExecutionEvent);

  // Update chart data every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setData((prev) => {
        const newData = [
          ...prev.slice(-(maxDataPoints - 1)),
          {
            time: timeStr,
            timestamp: now,
            completed: metrics.completed,
            failed: metrics.failed,
            running: metrics.running,
          },
        ];
        return newData;
      });

      // Reset counters after recording (for rate calculation)
      setMetrics((prev) => ({
        completed: 0,
        failed: 0,
        running: prev.running,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [metrics, maxDataPoints]);

  // Calculate totals from visible data
  const totals = data.reduce(
    (acc, point) => ({
      completed: acc.completed + point.completed,
      failed: acc.failed + point.failed,
    }),
    { completed: 0, failed: 0 }
  );

  const successRate = totals.completed + totals.failed > 0
    ? Math.round((totals.completed / (totals.completed + totals.failed)) * 100)
    : 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Execution Metrics</h3>
          <p className="text-sm text-muted-foreground">Task completions per second</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Completed ({totals.completed})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Failed ({totals.failed})</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {successRate}% success
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            stroke="#666"
            fontSize={10}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#666"
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1b26',
              border: '1px solid #333',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorCompleted)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="failed"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#colorFailed)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
