import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, Trash2, Download, Pause, Play } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface TerminalProps {
  executionId?: string;
  title?: string;
  className?: string;
  onData?: (data: string) => void;
  initialContent?: string;
}

export function Terminal({
  executionId,
  title = 'Terminal',
  className,
  onData,
  initialContent,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const bufferRef = useRef<string[]>([]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
      scrollback: 10000,
      convertEol: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle terminal input if onData callback is provided
    if (onData) {
      term.onData((data) => {
        onData(data);
      });
    }

    // Write initial content if provided
    if (initialContent) {
      term.write(initialContent);
    }

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
  }, [initialContent, onData]);

  // Re-fit terminal when maximized state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMaximized]);

  // Write data to terminal
  const write = useCallback((data: string) => {
    if (isPaused) {
      bufferRef.current.push(data);
      return;
    }

    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  }, [isPaused]);

  // Write line to terminal
  const writeln = useCallback((data: string) => {
    write(data + '\r\n');
  }, [write]);

  // Clear terminal
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  // Resume and flush buffered content
  const resume = useCallback(() => {
    setIsPaused(false);
    if (xtermRef.current && bufferRef.current.length > 0) {
      bufferRef.current.forEach((data) => {
        xtermRef.current?.write(data);
      });
      bufferRef.current = [];
    }
  }, []);

  // Download terminal content
  const downloadContent = useCallback(() => {
    if (!xtermRef.current) return;

    const buffer = xtermRef.current.buffer.active;
    let content = '';

    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        content += line.translateToString(true) + '\n';
      }
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${executionId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [executionId]);

  // Expose write methods via ref
  useEffect(() => {
    // Expose methods for external use
    (window as { __terminal?: { write: typeof write; writeln: typeof writeln; clear: typeof clear } }).__terminal = {
      write,
      writeln,
      clear,
    };
  }, [write, writeln, clear]);

  return (
    <div
      className={cn(
        'rounded-lg border bg-[#0d1117] overflow-hidden flex flex-col',
        isMaximized && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-xs text-[#8b949e] ml-2 font-medium">
            {title}
            {executionId && (
              <span className="text-[#58a6ff] ml-2">
                [{executionId.slice(0, 8)}]
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            onClick={clear}
            title="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            onClick={downloadContent}
            title="Download"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#8b949e] hover:text-white hover:bg-[#30363d]"
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

      {/* Paused indicator */}
      {isPaused && (
        <div className="bg-yellow-500/20 text-yellow-500 text-xs px-3 py-1 flex items-center gap-2">
          <Pause className="h-3 w-3" />
          Output paused - {bufferRef.current.length} lines buffered
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-xs ml-auto"
            onClick={resume}
          >
            Resume
          </Button>
        </div>
      )}

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className={cn(
          'flex-1 p-2',
          isMaximized ? 'h-[calc(100%-60px)]' : 'h-[300px]'
        )}
      />
    </div>
  );
}

// Hook for using terminal programmatically
export function useTerminal(terminalRef: React.RefObject<HTMLDivElement | null>) {
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const initialize = useCallback(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      term.dispose();
    };
  }, [terminalRef]);

  const write = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const writeln = useCallback((data: string) => {
    xtermRef.current?.writeln(data);
  }, []);

  const clear = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return {
    initialize,
    write,
    writeln,
    clear,
    fit,
    terminal: xtermRef.current,
  };
}
