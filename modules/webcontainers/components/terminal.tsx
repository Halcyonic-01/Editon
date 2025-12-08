// FILE: modules/webcontainers/components/terminal.tsx

"use client";

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";

interface TerminalProps {
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: any;
}

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(({ 
  className,
  theme = "dark",
  webContainerInstance
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const shellProcessRef = useRef<any>(null);
  const isShellStarting = useRef(false);

  const terminalThemes = {
    dark: { background: "#09090B", foreground: "#FAFAFA", cursor: "#FAFAFA", cursorAccent: "#09090B", selection: "#27272A", black: "#18181B", red: "#EF4444", green: "#22C55E", yellow: "#EAB308", blue: "#3B82F6", magenta: "#A855F7", cyan: "#06B6D4", white: "#F4F4F5", brightBlack: "#3F3F46", brightRed: "#F87171", brightGreen: "#4ADE80", brightYellow: "#FDE047", brightBlue: "#60A5FA", brightMagenta: "#C084FC", brightCyan: "#22D3EE", brightWhite: "#FFFFFF" },
    light: { background: "#FFFFFF", foreground: "#18181B", cursor: "#18181B", cursorAccent: "#FFFFFF", selection: "#E4E4E7", black: "#18181B", red: "#DC2626", green: "#16A34A", yellow: "#CA8A04", blue: "#2563EB", magenta: "#9333EA", cyan: "#0891B2", white: "#F4F4F5", brightBlack: "#71717A", brightRed: "#EF4444", brightGreen: "#22C55E", brightYellow: "#EAB308", brightBlue: "#3B82F6", brightMagenta: "#A855F7", brightCyan: "#06B6D4", brightWhite: "#FAFAFA" },
  };

  const clearTerminal = useCallback(() => {
    term.current?.clear();
  }, []);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    writeToTerminal: (data: string) => {
      term.current?.write(data);
    },
    clearTerminal,
    focusTerminal: () => {
      term.current?.focus();
    },
  }));

  // This is the single, main effect to initialize the terminal and shell
  useEffect(() => {
    // Prevent double initialization
    if (term.current || !webContainerInstance || !terminalRef.current) {
      return;
    }

    // 1. Initialize xterm.js
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
      fontSize: 14,
      theme: terminalThemes[theme],
      convertEol: true,
      allowProposedApi: true,
    });
    term.current = terminal;

    const fitAddonInstance = new FitAddon();
    fitAddon.current = fitAddonInstance;

    const searchAddonInstance = new SearchAddon();
    searchAddon.current = searchAddonInstance;

    terminal.loadAddon(fitAddonInstance);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(searchAddonInstance);

    terminal.open(terminalRef.current);

    // 2. Define the shell starter logic
    const startShell = async () => {
      if (isShellStarting.current) {
        return;
      }

      isShellStarting.current = true;

      try {
        // Verify WebContainer is still valid
        if (!webContainerInstance) {
          throw new Error('WebContainer instance is not available');
        }

        // Force fit to update internal dimensions
        fitAddonInstance.fit();

        // Wait a bit for the fit to take effect
        await new Promise(resolve => setTimeout(resolve, 50));

        // CRITICAL FIX: Ensure non-zero dimensions.
        // If fit() fails (returns 0 or NaN), fallback to standard 80x24 size.
        const safeCols = terminal.cols && terminal.cols > 0 ? terminal.cols : 80;
        const safeRows = terminal.rows && terminal.rows > 0 ? terminal.rows : 24;

        terminal.write('\x1b[32m$ Starting shell...\x1b[0m\r\n');

        // Spawn the shell process with error handling
        let shellProcess;
        try {
          shellProcess = await webContainerInstance.spawn('jsh', {
            terminal: {
              cols: safeCols,
              rows: safeRows,
            },
          });
        } catch (spawnError) {
          throw new Error(`Failed to spawn shell: ${spawnError instanceof Error ? spawnError.message : String(spawnError)}`);
        }

        if (!shellProcess) {
          throw new Error('Shell process is null');
        }

        shellProcessRef.current = shellProcess;

        // Pipe shell output to terminal
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (term.current) {
                terminal.write(data);
              }
            },
          })
        ).catch((error: any) => {
          console.error("Output pipe error:", error);
        });

        const input = shellProcess.input.getWriter();
        
        // Handle terminal input
        const dataListener = terminal.onData((data) => {
          try {
            input.write(data);
          } catch(e) {
            console.error("Input write error:", e);
          }
        });

        // Resize the process whenever the terminal resizes
        const resizeListener = terminal.onResize((size) => {
          if (size.cols > 0 && size.rows > 0 && shellProcessRef.current) {
            try {
              shellProcess.resize({
                cols: size.cols,
                rows: size.rows
              });
            } catch (e) {
              console.error("Resize error:", e);
            }
          }
        });

        // Handle process exit
        shellProcess.exit.then((code: any) => {
          if (term.current) {
            terminal.write(`\r\n\x1b[33mShell exited with code ${code}\x1b[0m\r\n`);
          }
          dataListener.dispose();
          resizeListener.dispose();
          shellProcessRef.current = null;
        }).catch((error: any) => {
          console.error("Shell exit error:", error);
        });

      } catch (error) {
        console.error("Shell spawn error:", error);
        if (term.current) {
          terminal.write(`\r\n\x1b[31mError starting shell: ${error instanceof Error ? error.message : String(error)}\x1b[0m\r\n`);
          terminal.write(`\r\n\x1b[33mPlease make sure WebContainer is fully initialized.\x1b[0m\r\n`);
        }
      } finally {
        isShellStarting.current = false;
      }
    };

    // 3. Wait for layout, then start
    // We use a timeout to allow React/CSS layout to settle before calculating size
    const initTimer = setTimeout(() => {
      startShell();
    }, 300);

    // 4. Handle window resizing
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      requestAnimationFrame(() => {
        fitAddonInstance.fit();
      });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      if (shellProcessRef.current) {
        try {
          shellProcessRef.current.kill();
        } catch (e) {
          console.error("Error killing shell process:", e);
        }
        shellProcessRef.current = null;
      }
      terminal.dispose();
      term.current = null;
      fitAddon.current = null;
      searchAddon.current = null;
      isShellStarting.current = false;
    };
  }, [webContainerInstance, theme]);

  // UI state and helper functions
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const copyTerminalContent = useCallback(async () => {
    if (!term.current) return;
    
    try {
      const selection = term.current.getSelection();
      const content = selection || term.current.buffer.active.getLine(0)?.translateToString() || '';
      
      if (content) {
        await navigator.clipboard.writeText(content);
      }
    } catch (error) {
      console.error("Failed to copy terminal content:", error);
    }
  }, []);
  
  const downloadTerminalLog = useCallback(() => {
    if (!term.current) return;
    
    try {
      let content = '';
      const buffer = term.current.buffer.active;
      
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString() + '\n';
        }
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-log-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download terminal log:", error);
    }
  }, []);
  
  const searchInTerminal = useCallback((searchText: string) => {
    if (!searchAddon.current || !searchText) return;
    
    try {
      searchAddon.current.findNext(searchText, {
        decorations: {
          matchBackground: '#ffff00',
          matchBorder: '#ff0000',
          activeMatchBackground: '#00ff00',
          matchOverviewRuler: '#ffff00',
          activeMatchColorOverviewRuler: '#00ff00',
        }
      });
    } catch (error) {
      console.error("Search error:", error);
    }
  }, []);

  return (
    <div className={cn("flex flex-col h-full bg-background border rounded-lg overflow-hidden", className)}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium">Terminal</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={copyTerminalContent}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={downloadTerminalLog}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={clearTerminal}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b bg-muted/30">
          <Input
            placeholder="Search in terminal..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              searchInTerminal(e.target.value);
            }}
            className="h-8"
          />
        </div>
      )}

      {/* Terminal Content */}
      <div className="flex-1 relative" onClick={() => term.current?.focus()}>
        <div ref={terminalRef} className="absolute inset-0 p-2" />
      </div>
    </div>
  );
});

TerminalComponent.displayName = "TerminalComponent";

export default TerminalComponent;