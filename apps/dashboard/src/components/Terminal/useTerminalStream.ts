/**
 * useTerminalStream Hook
 *
 * Connects a terminal to WebSocket execution streams for real-time output.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { useWebSocket, useExecutionStream, useAgentSubscription } from '../../core/websocket';
import type { ExecutionStreamEvent } from '@mcp/types';

export interface UseTerminalStreamOptions {
  /** Execution ID to stream */
  executionId?: string;
  /** Task ID to stream */
  taskId?: string;
  /** Agent ID to stream */
  agentId?: string;
  /** Terminal instance reference */
  terminal: Terminal | null;
  /** Callback on execution complete */
  onComplete?: (result: { success: boolean; output: string }) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export function useTerminalStream({
  executionId,
  taskId,
  agentId,
  terminal,
  onComplete,
  onError,
}: UseTerminalStreamOptions) {
  const { isConnected } = useWebSocket();
  const outputBufferRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Subscribe to agent if provided
  useAgentSubscription(agentId);

  // Write output to terminal with proper formatting
  const writeOutput = useCallback(
    (output: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
      if (!terminal) return;

      const colors: Record<string, string> = {
        info: '\x1b[37m', // white
        error: '\x1b[31m', // red
        success: '\x1b[32m', // green
        warning: '\x1b[33m', // yellow
      };
      const reset = '\x1b[0m';

      terminal.write(`${colors[type]}${output}${reset}`);
      outputBufferRef.current += output;
    },
    [terminal]
  );

  // Write a formatted line
  const writeLine = useCallback(
    (line: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
      writeOutput(`${line}\r\n`, type);
    },
    [writeOutput]
  );

  // Write system message
  const writeSystem = useCallback(
    (message: string) => {
      if (!terminal) return;
      terminal.write(`\x1b[36m[SYSTEM]\x1b[0m ${message}\r\n`);
    },
    [terminal]
  );

  // Handle execution stream events
  const handleExecutionStream = useCallback(
    (event: ExecutionStreamEvent) => {
      // Filter by taskId or agentId if specified
      if (taskId && event.taskId !== taskId) return;
      if (agentId && event.agentId !== agentId) return;
      if (executionId && event.executionId !== executionId) return;

      const { phase, output, toolCall, fileChanged } = event.data;

      switch (phase) {
        case 'starting':
        case 'queued':
          writeSystem(`Execution ${phase} for task ${event.taskId}`);
          break;
        case 'running':
          if (output) {
            writeOutput(output);
          }
          if (toolCall) {
            writeSystem(`Tool call: ${toolCall.name}`);
          }
          if (fileChanged) {
            const action = fileChanged.action.toUpperCase();
            const info = fileChanged.lines
              ? ` (+${fileChanged.lines.added}/-${fileChanged.lines.removed})`
              : '';
            writeSystem(`File ${action}: ${fileChanged.path}${info}`);
          }
          break;
        case 'completed':
          writeSystem(`Execution completed successfully`);
          onComplete?.({ success: true, output: outputBufferRef.current });
          break;
        case 'failed':
        case 'cancelled':
          writeLine(`Execution ${phase}`, 'error');
          onComplete?.({ success: false, output: outputBufferRef.current });
          onError?.(`Execution ${phase}`);
          break;
      }
    },
    [taskId, agentId, executionId, writeOutput, writeLine, writeSystem, onComplete, onError]
  );

  // Subscribe to execution events using the hook
  useExecutionStream(handleExecutionStream);

  // Initialize terminal with connection message
  useEffect(() => {
    if (!terminal || !isConnected || isInitializedRef.current) return;

    const subscriptionKey = executionId || taskId || agentId;
    if (!subscriptionKey) return;

    isInitializedRef.current = true;

    // Clear terminal and show connection message
    terminal.clear();
    writeSystem(`Connected to execution stream`);
    if (executionId) writeSystem(`Execution ID: ${executionId}`);
    if (taskId) writeSystem(`Task ID: ${taskId}`);
    if (agentId) writeSystem(`Agent ID: ${agentId}`);
    writeLine('');

    return () => {
      isInitializedRef.current = false;
    };
  }, [terminal, isConnected, executionId, taskId, agentId, writeSystem, writeLine]);

  // Public API
  return {
    isConnected,
    writeOutput,
    writeLine,
    writeSystem,
    getBuffer: () => outputBufferRef.current,
    clearBuffer: () => {
      outputBufferRef.current = '';
      terminal?.clear();
    },
  };
}

export default useTerminalStream;
