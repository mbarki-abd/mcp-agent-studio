import { TimeSeriesPoint } from '@/core/api/hooks';

interface TrendChartProps {
  data: TimeSeriesPoint[];
  color?: string;
}

export function TrendChart({ data, color = 'hsl(var(--chart-1))' }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const height = 200;
  const padding = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Create path for line chart
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - (point.value / maxValue) * chartHeight;
    return { x, y, value: point.value, date: point.date };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Y-axis labels
  const yLabels = [0, Math.round(maxValue / 2), maxValue];

  return (
    <div className="h-[200px] w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yLabels.map((label, i) => {
            const y = chartHeight - (label / maxValue) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeDasharray="2,2"
                />
                <text
                  x={-5}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  fontSize="3"
                  fill="hsl(var(--muted-foreground))"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill={color} fillOpacity={0.1} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="0.5" />

          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="1"
              fill={color}
              className="hover:r-[1.5] transition-all"
            >
              <title>
                {point.date}: {point.value}
              </title>
            </circle>
          ))}
        </g>
      </svg>
    </div>
  );
}
