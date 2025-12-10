import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, Copy, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface TerminalViewProps {
  agentId: string;
  output?: string[];
  onClear?: () => void;
  className?: string;
  maxLines?: number;
}

export function TerminalView({
  agentId,
  output = [],
  onClear,
  className,
  maxLines = 1000,
}: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastLineCountRef = useRef(0);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new XTerminal({
      cursorBlink: false,
      disableStdin: true,
      fontSize: 12,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#a9b1d6',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#c0a5ff',
        brightCyan: '#0db9d7',
        brightWhite: '#c0caf5',
      },
      convertEol: true,
      scrollback: maxLines,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Write initial welcome message
    terminal.writeln(`\x1b[36m[Agent: ${agentId}]\x1b[0m Terminal ready`);
    terminal.writeln('');

    return () => {
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentId, maxLines]);

  // Fit terminal on resize
  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Re-fit when expanded state changes
  useEffect(() => {
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
  }, [isExpanded]);

  // Write new output lines
  useEffect(() => {
    if (!xtermRef.current || output.length === 0) return;

    const newLines = output.slice(lastLineCountRef.current);
    newLines.forEach((line) => {
      xtermRef.current?.writeln(formatLine(line));
    });

    lastLineCountRef.current = output.length;
  }, [output]);

  const formatLine = (line: string): string => {
    // Add colors based on log level or content
    if (line.includes('[ERROR]') || line.includes('error:')) {
      return `\x1b[31m${line}\x1b[0m`;
    }
    if (line.includes('[WARN]') || line.includes('warning:')) {
      return `\x1b[33m${line}\x1b[0m`;
    }
    if (line.includes('[INFO]')) {
      return `\x1b[36m${line}\x1b[0m`;
    }
    if (line.includes('[DEBUG]')) {
      return `\x1b[90m${line}\x1b[0m`;
    }
    if (line.startsWith('>') || line.startsWith('$')) {
      return `\x1b[32m${line}\x1b[0m`;
    }
    return line;
  };

  const handleCopy = useCallback(async () => {
    if (!xtermRef.current) return;
    const selection = xtermRef.current.getSelection();
    if (selection) {
      await navigator.clipboard.writeText(selection);
    } else {
      // Copy all content
      const buffer = xtermRef.current.buffer.active;
      const lines: string[] = [];
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }
      await navigator.clipboard.writeText(lines.join('\n'));
    }
  }, []);

  const handleClear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      lastLineCountRef.current = 0;
    }
    onClear?.();
  }, [onClear]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg overflow-hidden border bg-[#1a1b26]',
        isExpanded && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1b26] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 ml-2">
            Terminal - {agentId}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={handleCopy}
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={handleClear}
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className={cn(
          'flex-1',
          isExpanded ? 'h-full' : 'h-64'
        )}
      />
    </div>
  );
}
