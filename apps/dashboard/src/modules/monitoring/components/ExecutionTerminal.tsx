import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useWebSocket } from '../../../core/websocket/WebSocketProvider';
import { Maximize2, Minimize2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useState } from 'react';
import type { ExecutionStreamEvent } from '@mcp/types';

interface ExecutionTerminalProps {
  executionId: string;
  agentId?: string;
  className?: string;
  autoScroll?: boolean;
}

export function ExecutionTerminal({
  executionId,
  agentId,
  className,
  autoScroll = true,
}: ExecutionTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  const { isConnected, subscribe, unsubscribe, onExecution } = useWebSocket();

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
      scrollback: 5000,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial welcome message
    term.writeln('\x1b[36m--- Execution Terminal ---\x1b[0m');
    term.writeln(`\x1b[90mExecution ID: ${executionId}\x1b[0m`);
    term.writeln('');

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [executionId]);

  // Re-fit terminal when maximized state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMaximized]);

  // Subscribe to execution events
  useEffect(() => {
    if (!isConnected || !agentId) return;

    subscribe('agent', agentId);

    return () => {
      unsubscribe('agent', agentId);
    };
  }, [isConnected, agentId, subscribe, unsubscribe]);

  // Handle execution stream events
  useEffect(() => {
    const unsubscribeExecution = onExecution((event: ExecutionStreamEvent) => {
      if (event.executionId !== executionId) return;
      if (!xtermRef.current) return;

      const term = xtermRef.current;
      const { phase, output, toolCall, fileChanged } = event.data;

      // Update status
      if (phase === 'running') setStatus('running');
      else if (phase === 'completed') setStatus('completed');
      else if (phase === 'failed') setStatus('failed');

      // Write output
      if (output) {
        term.write(output);
      }

      // Tool call notification
      if (toolCall) {
        term.writeln(`\x1b[33m[Tool: ${toolCall.name}]\x1b[0m`);
      }

      // File change notification
      if (fileChanged) {
        const actionColor = fileChanged.action === 'create' ? '32' :
                           fileChanged.action === 'delete' ? '31' : '33';
        term.writeln(`\x1b[${actionColor}m[File ${fileChanged.action}: ${fileChanged.path}]\x1b[0m`);
        if (fileChanged.lines) {
          term.writeln(`  \x1b[32m+${fileChanged.lines.added}\x1b[0m / \x1b[31m-${fileChanged.lines.removed}\x1b[0m`);
        }
      }

      // Auto scroll
      if (autoScroll) {
        term.scrollToBottom();
      }
    });

    return () => {
      unsubscribeExecution();
    };
  }, [executionId, autoScroll, onExecution]);

  // Clear terminal
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln('\x1b[36m--- Terminal Cleared ---\x1b[0m');
      xtermRef.current.writeln('');
    }
  }, []);

  // Status indicator color
  const statusColors = {
    idle: 'bg-gray-500',
    running: 'bg-yellow-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-[#2a2b3d] bg-[#1a1b26] overflow-hidden flex flex-col',
        isMaximized && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#16161e] border-b border-[#2a2b3d]">
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
          <span className="text-xs text-[#565f89] font-medium">
            Execution Output
          </span>
          <span className="text-xs text-[#7aa2f7] font-mono">
            {executionId.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isConnected && (
            <span className="text-xs text-red-400 mr-2">Disconnected</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#565f89] hover:text-white hover:bg-[#2a2b3d]"
            onClick={clear}
            title="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#565f89] hover:text-white hover:bg-[#2a2b3d]"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {status !== 'idle' && (
        <div
          className={cn(
            'text-xs px-3 py-1 flex items-center gap-2',
            status === 'running' && 'bg-yellow-500/10 text-yellow-400',
            status === 'completed' && 'bg-green-500/10 text-green-400',
            status === 'failed' && 'bg-red-500/10 text-red-400'
          )}
        >
          {status === 'running' && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              Execution in progress...
            </>
          )}
          {status === 'completed' && 'Execution completed successfully'}
          {status === 'failed' && 'Execution failed'}
        </div>
      )}

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className={cn(
          'flex-1 overflow-hidden',
          isMaximized ? 'h-[calc(100%-80px)]' : 'h-[400px]'
        )}
        style={{ padding: '8px' }}
      />
    </div>
  );
}

// Simple streaming terminal for displaying output
interface StreamingTerminalProps {
  className?: string;
  initialLines?: string[];
}

export function StreamingTerminal({
  className,
  initialLines = [],
}: StreamingTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 12,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
      },
      scrollback: 1000,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Write initial lines
    initialLines.forEach((line) => term.writeln(line));

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Method to append text
  const append = useCallback((text: string) => {
    xtermRef.current?.write(text);
    xtermRef.current?.scrollToBottom();
  }, []);

  const appendLine = useCallback((text: string) => {
    xtermRef.current?.writeln(text);
    xtermRef.current?.scrollToBottom();
  }, []);

  // Expose methods for external use
  useEffect(() => {
    const container = terminalRef.current;
    if (container) {
      (container as { append?: typeof append; appendLine?: typeof appendLine }).append = append;
      (container as { append?: typeof append; appendLine?: typeof appendLine }).appendLine = appendLine;
    }
  }, [append, appendLine]);

  return (
    <div
      ref={terminalRef}
      className={cn('h-[300px] rounded-lg overflow-hidden', className)}
    />
  );
}
