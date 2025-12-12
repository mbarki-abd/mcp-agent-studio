/**
 * Terminal Component
 *
 * Real-time terminal output using xterm.js with WebSocket streaming support.
 * Used for displaying task execution output, agent logs, and system messages.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Copy, Trash2, Download, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface TerminalProps {
  /** Unique identifier for this terminal instance */
  id?: string;
  /** Initial content to display */
  initialContent?: string;
  /** Additional CSS classes */
  className?: string;
  /** Height of the terminal */
  height?: string | number;
  /** Callback when terminal is ready */
  onReady?: (terminal: XTerm) => void;
  /** Callback when user inputs data (if input is enabled) */
  onData?: (data: string) => void;
  /** Whether to allow user input */
  allowInput?: boolean;
  /** Terminal theme */
  theme?: 'dark' | 'light';
  /** Show toolbar */
  showToolbar?: boolean;
  /** Font size */
  fontSize?: number;
  /** Title for the terminal */
  title?: string;
}

// Terminal themes
const themes = {
  dark: {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selectionBackground: '#364a82',
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
    brightMagenta: '#c0a0ff',
    brightCyan: '#0db9d7',
    brightWhite: '#c0caf5',
  },
  light: {
    background: '#f5f5f5',
    foreground: '#1f2937',
    cursor: '#1f2937',
    cursorAccent: '#f5f5f5',
    selectionBackground: '#bfdbfe',
    black: '#1f2937',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#ca8a04',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#f3f4f6',
    brightBlack: '#4b5563',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#ffffff',
  },
};

export function Terminal({
  id,
  initialContent,
  className,
  height = 400,
  onReady,
  onData,
  allowInput = false,
  theme = 'dark',
  showToolbar = true,
  fontSize = 14,
  title,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const contentBufferRef = useRef<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      theme: themes[theme],
      fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: allowInput,
      cursorStyle: 'block',
      disableStdin: !allowInput,
      convertEol: true,
      scrollback: 10000,
      tabStopWidth: 4,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Write initial content
    if (initialContent) {
      xterm.write(initialContent);
      contentBufferRef.current = initialContent;
    }

    // Handle user input
    if (allowInput && onData) {
      xterm.onData(onData);
    }

    // Call onReady callback
    onReady?.(xterm);

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      xterm.dispose();
    };
  }, [theme, fontSize, allowInput, onData, onReady, initialContent]);

  // Public method to write to terminal
  const write = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
      contentBufferRef.current += data;
    }
  }, []);

  // Public method to write line to terminal
  const writeLine = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.writeln(data);
      contentBufferRef.current += data + '\n';
    }
  }, []);

  // Public method to clear terminal
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      contentBufferRef.current = '';
    }
  }, []);

  // Copy content to clipboard
  const handleCopy = useCallback(async () => {
    const selection = xtermRef.current?.getSelection();
    const content = selection || contentBufferRef.current;
    await navigator.clipboard.writeText(content);
  }, []);

  // Download content as file
  const handleDownload = useCallback(() => {
    const blob = new Blob([contentBufferRef.current], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-output-${id || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [id]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    // Give time for DOM to update, then refit
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
  }, []);

  // Expose methods via ref
  useEffect(() => {
    if (terminalRef.current) {
      (terminalRef.current as any).write = write;
      (terminalRef.current as any).writeLine = writeLine;
      (terminalRef.current as any).clear = clear;
    }
  }, [write, writeLine, clear]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg overflow-hidden border bg-background',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
      style={{ height: isFullscreen ? 'auto' : height }}
    >
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            {title && (
              <span className="text-sm text-muted-foreground ml-2">{title}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clear}
              title="Clear"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ backgroundColor: themes[theme].background }}
      />
    </div>
  );
}

export default Terminal;
