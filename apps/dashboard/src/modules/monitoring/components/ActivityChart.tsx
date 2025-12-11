import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useWebSocket, useAgentStatus } from '../../../core/websocket/WebSocketProvider';
import type { AgentStatusEvent } from '@mcp/types';

interface DataPoint {
  time: string;
  timestamp: number;
  active: number;
  busy: number;
  error: number;
  total: number;
}

interface ActivityChartProps {
  agentIds: string[];
  maxDataPoints?: number;
  className?: string;
}

export function ActivityChart({
  agentIds,
  maxDataPoints = 30,
  className,
}: ActivityChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Map<string, string>>(new Map());

  const { isConnected } = useWebSocket();

  // Initialize with sample data point
  useEffect(() => {
    const now = Date.now();
    const initialData: DataPoint[] = [];

    // Generate last 30 seconds of empty data
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
        active: 0,
        busy: 0,
        error: 0,
        total: agentIds.length,
      });
    }

    setData(initialData);
  }, [agentIds.length, maxDataPoints]);

  // Handle agent status updates
  const handleStatusUpdate = useCallback((event: AgentStatusEvent) => {
    setAgentStatuses((prev) => {
      const newMap = new Map(prev);
      newMap.set(event.agentId, event.data.status);
      return newMap;
    });
  }, []);

  useAgentStatus(handleStatusUpdate);

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

      // Count agents by status
      let active = 0;
      let busy = 0;
      let error = 0;

      agentStatuses.forEach((status) => {
        if (status === 'ACTIVE') active++;
        else if (status === 'BUSY') busy++;
        else if (status === 'ERROR') error++;
      });

      setData((prev) => {
        const newData = [
          ...prev.slice(-(maxDataPoints - 1)),
          {
            time: timeStr,
            timestamp: now,
            active,
            busy,
            error,
            total: agentIds.length,
          },
        ];
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [agentStatuses, agentIds.length, maxDataPoints]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Agent Activity</h3>
          <p className="text-sm text-muted-foreground">Real-time agent status over time</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Busy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Error</span>
          </div>
          {!isConnected && (
            <span className="text-red-400 ml-2">Disconnected</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            domain={[0, Math.max(agentIds.length, 5)]}
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
          <ReferenceLine y={agentIds.length} stroke="#444" strokeDasharray="3 3" label="" />
          <Line
            type="monotone"
            dataKey="active"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="busy"
            stroke="#eab308"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="error"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
