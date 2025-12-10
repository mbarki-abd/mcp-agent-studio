import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';

export type ChartType = 'line' | 'area' | 'bar';

export interface MetricDataPoint {
  timestamp: Date | string | number;
  [key: string]: number | Date | string;
}

export interface MetricSeries {
  key: string;
  label: string;
  color: string;
  type?: 'monotone' | 'linear' | 'step';
}

interface MetricsChartProps {
  data: MetricDataPoint[];
  series: MetricSeries[];
  chartType?: ChartType;
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
  timeFormat?: string;
  yAxisLabel?: string;
  stacked?: boolean;
}

const defaultColors = [
  '#7aa2f7', // blue
  '#9ece6a', // green
  '#f7768e', // red
  '#e0af68', // yellow
  '#bb9af7', // purple
  '#7dcfff', // cyan
];

function CustomTooltip({
  active,
  payload,
  label,
  timeFormat = 'HH:mm:ss',
}: TooltipProps<number, string> & { timeFormat?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="text-muted-foreground mb-2">
        {format(new Date(label), timeFormat)}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MetricsChart({
  data,
  series,
  chartType = 'line',
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
  timeFormat = 'HH:mm',
  yAxisLabel,
  stacked = false,
}: MetricsChartProps) {
  // Process data to ensure timestamps are valid
  const processedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      timestamp:
        typeof point.timestamp === 'string' || typeof point.timestamp === 'number'
          ? new Date(point.timestamp).getTime()
          : point.timestamp.getTime(),
    }));
  }, [data]);

  // Assign colors to series
  const coloredSeries = useMemo(() => {
    return series.map((s, i) => ({
      ...s,
      color: s.color || defaultColors[i % defaultColors.length],
    }));
  }, [series]);

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 5, right: 10, left: 10, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: 'timestamp',
      tickFormatter: (value: number) => format(new Date(value), timeFormat),
      tick: { fontSize: 11, fill: '#888' },
      axisLine: { stroke: '#333' },
      tickLine: { stroke: '#333' },
    };

    const yAxisProps = {
      tick: { fontSize: 11, fill: '#888' },
      axisLine: { stroke: '#333' },
      tickLine: { stroke: '#333' },
      label: yAxisLabel
        ? {
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: '#888', fontSize: 11 },
          }
        : undefined,
    };

    const tooltipProps = {
      content: <CustomTooltip timeFormat={timeFormat} />,
      cursor: { stroke: '#444', strokeWidth: 1 },
    };

    const legendProps = {
      formatter: (value: string) => (
        <span className="text-xs text-muted-foreground">{value}</span>
      ),
    };

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
          )}
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          {showLegend && <Legend {...legendProps} />}
          {coloredSeries.map((s) => (
            <Area
              key={s.key}
              type={s.type || 'monotone'}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.2}
              strokeWidth={2}
              stackId={stacked ? 'stack' : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
          )}
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          {showLegend && <Legend {...legendProps} />}
          {coloredSeries.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
        )}
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip {...tooltipProps} />
        {showLegend && <Legend {...legendProps} />}
        {coloredSeries.map((s) => (
          <Line
            key={s.key}
            type={s.type || 'monotone'}
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    );
  };

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border rounded-lg bg-card',
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg bg-card p-4', className)}>
      {title && <h3 className="font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

// Preset chart configurations
export function TokensUsageChart({
  data,
  ...props
}: Omit<MetricsChartProps, 'series'> & { data: MetricDataPoint[] }) {
  return (
    <MetricsChart
      data={data}
      series={[
        { key: 'inputTokens', label: 'Input Tokens', color: '#7aa2f7' },
        { key: 'outputTokens', label: 'Output Tokens', color: '#9ece6a' },
      ]}
      chartType="area"
      stacked
      {...props}
    />
  );
}

export function ExecutionDurationChart({
  data,
  ...props
}: Omit<MetricsChartProps, 'series'> & { data: MetricDataPoint[] }) {
  return (
    <MetricsChart
      data={data}
      series={[
        { key: 'duration', label: 'Duration (ms)', color: '#bb9af7' },
      ]}
      yAxisLabel="ms"
      {...props}
    />
  );
}

export function AgentActivityChart({
  data,
  ...props
}: Omit<MetricsChartProps, 'series'> & { data: MetricDataPoint[] }) {
  return (
    <MetricsChart
      data={data}
      series={[
        { key: 'active', label: 'Active', color: '#9ece6a' },
        { key: 'busy', label: 'Busy', color: '#7aa2f7' },
        { key: 'error', label: 'Errors', color: '#f7768e' },
      ]}
      chartType="bar"
      {...props}
    />
  );
}

export function TaskCompletionChart({
  data,
  ...props
}: Omit<MetricsChartProps, 'series'> & { data: MetricDataPoint[] }) {
  return (
    <MetricsChart
      data={data}
      series={[
        { key: 'completed', label: 'Completed', color: '#9ece6a' },
        { key: 'failed', label: 'Failed', color: '#f7768e' },
      ]}
      chartType="bar"
      stacked
      {...props}
    />
  );
}
