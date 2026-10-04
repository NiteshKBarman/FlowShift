import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import {
  Play,
  Square,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';

export const TerminalDrawer: React.FC = () => {
  const {
    terminalOpen,
    toggleTerminal,
    terminalOutput,
    clearTerminal,
    runCode,
    isExecuting,
    isWaitingForInput,
    inputPrompt,
    sendTerminalInput,
    killExecution,
    lastExecutionStatus,
    lastExecutionTimeMs,
    lastExitCode,
    sourceLanguage,
  } = useEditorStore();

  const [copied, setCopied] = useState(false);
  const [isExpandedFull, setIsExpandedFull] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of terminal when output updates or waiting for input
  useEffect(() => {
    if (terminalOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput, isWaitingForInput, terminalOpen]);

  // Auto-focus input whenever waiting for input or terminal opens
  useEffect(() => {
    if (terminalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [terminalOpen, isWaitingForInput]);

  const handleCopy = () => {
    navigator.clipboard.writeText(terminalOutput.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+C to abort / interrupt
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      killExecution();
      setInputValue('');
      return;
    }

    // Up Arrow for history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputValue(history[nextIdx] || '');
      }
      return;
    }

    // Down Arrow for history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx >= history.length) {
          setHistoryIdx(-1);
          setInputValue('');
        } else {
          setHistoryIdx(nextIdx);
          setInputValue(history[nextIdx] || '');
        }
      }
      return;
    }

    // Enter to submit
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue;
      if (val.trim()) {
        setHistory((prev) => [...prev, val]);
      }
      setHistoryIdx(-1);
      setInputValue('');
      sendTerminalInput(val);
    }
  };

  const formatLine = (line: string, index: number) => {
    if (line.startsWith('$') || line.startsWith('guest@flowshift')) {
      return (
        <div key={index} className="flex items-center gap-1.5 text-cyan-400 font-semibold py-0.5">
          <span className="text-emerald-400 select-none">&gt;</span>
          <span>{line}</span>
        </div>
      );
    }
    if (line.startsWith('[Compilation Error]') || line.startsWith('[Runtime') || line.startsWith('[Error]')) {
      return (
        <div key={index} className="text-rose-400 font-semibold py-0.5 pl-2 border-l-2 border-rose-500 bg-rose-950/30 my-0.5 rounded-r">
          {line}
        </div>
      );
    }
    if (line.startsWith('  ✗')) {
      return (
        <div key={index} className="text-rose-300 py-0.5 pl-4 font-mono text-[11px]">
          {line}
        </div>
      );
    }
    if (line.startsWith('[FlowShift Compiler]') || line.startsWith('[Executing]') || line.startsWith('[Build]')) {
      return (
        <div key={index} className="text-slate-400 italic text-[11px] py-0.5">
          {line}
        </div>
      );
    }
    if (line.startsWith('[Process completed')) {
      return (
        <div key={index} className="text-emerald-400 font-medium py-1 text-[11px] flex items-center gap-1.5 border-t border-slate-800/80 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{line}</span>
        </div>
      );
    }
    if (line.startsWith('[Process terminated')) {
      return (
        <div key={index} className="text-rose-400 font-medium py-1 text-[11px] flex items-center gap-1.5 border-t border-slate-800/80 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>{line}</span>
        </div>
      );
    }
    return (
      <div key={index} className="text-slate-100 font-mono py-0.5 whitespace-pre-wrap break-words">
        {line}
      </div>
    );
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`border-t border-slate-800 bg-[#090d16] flex flex-col z-20 transition-all duration-200 select-none cursor-text ${
        terminalOpen
          ? isExpandedFull
            ? 'h-[80%] max-h-[80%]'
            : 'h-64 sm:h-72'
          : 'h-9'
      }`}
    >
      {/* Terminal Titlebar (macOS / Linux terminal style) */}
      <div className="h-9 px-3 bg-slate-900/95 border-b border-slate-800/90 flex items-center justify-between text-xs text-slate-300 font-medium shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* macOS window control dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTerminal();
              }}
              className="w-2.5 h-2.5 rounded-full bg-rose-500/80 hover:bg-rose-400 transition-colors"
              title="Close Terminal"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearTerminal();
              }}
              className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-400 transition-colors"
              title="Clear Output"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpandedFull(!isExpandedFull);
              }}
              className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
              title="Maximize / Restore"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTerminal();
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="font-semibold text-slate-200 tracking-tight font-mono text-[11px]">
              bash — 80x24
            </span>
            <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">
              ({sourceLanguage.toUpperCase()} environment)
            </span>
          </button>

          {/* Interactive Waiting for Input Badge */}
          {isWaitingForInput && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-500/50 text-[10px] font-mono animate-pulse shadow-sm shadow-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Input Required</span>
            </span>
          )}

          {/* Execution Status Badges */}
          {isExecuting && !isWaitingForInput && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[10px] font-mono animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Running PID 1024</span>
            </span>
          )}

          {!isExecuting && !isWaitingForInput && lastExecutionStatus === 'success' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Exit 0 • {lastExecutionTimeMs ?? 0}ms</span>
            </span>
          )}

          {!isExecuting && !isWaitingForInput && lastExecutionStatus === 'error' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>Exit {lastExitCode ?? 1}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Stop Button when executing */}
          {(isExecuting || isWaitingForInput) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                killExecution();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-semibold transition-all shadow-sm shadow-rose-500/20"
              title="Stop execution (Ctrl+C)"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                runCode();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-semibold transition-all shadow-sm shadow-emerald-500/20"
              title="Run Program (Shift+Enter)"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Run</span>
            </button>
          )}

          {terminalOpen && (
            <>
              {/* Copy Output Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1 px-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
                title="Copy Terminal Output"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>

              {/* Clear Output Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearTerminal();
                }}
                className="p-1 px-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
                title="Clear Output (cls/clear)"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              {/* Maximize / Height Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpandedFull(!isExpandedFull);
                }}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
                title={isExpandedFull ? 'Restore Size' : 'Maximize Terminal'}
              >
                {isExpandedFull ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </>
          )}

          {/* Toggle Expand / Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTerminal();
            }}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={terminalOpen ? 'Collapse Terminal' : 'Open Terminal'}
          >
            {terminalOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Screen Body */}
      {terminalOpen && (
        <div className="flex-1 min-h-0 flex flex-col bg-[#070b12] overflow-hidden font-mono select-text p-3">
          {/* Scrollable Output Screen */}
          <div className="flex-1 overflow-y-auto text-xs leading-relaxed space-y-0.5">
            {terminalOutput.map((line, idx) => formatLine(line, idx))}

            {/* Interactive Live Input Line */}
            <div className="flex items-center gap-1.5 pt-1 text-xs">
              {isWaitingForInput ? (
                // Paused at scanf / cin / input()
                <>
                  <span className="text-amber-400 font-bold select-none">&gt;&gt;</span>
                  {inputPrompt && (
                    <span className="text-slate-200 font-medium">{inputPrompt}</span>
                  )}
                  <div className="flex-1 flex items-center relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type input and press Enter..."
                      className="w-full bg-transparent text-emerald-300 font-bold focus:outline-none font-mono text-xs placeholder:text-slate-600"
                    />
                    <span className="w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 shrink-0 select-none"></span>
                  </div>
                </>
              ) : (
                // Shell Prompt (guest@flowshift:~$ )
                <>
                  <span className="select-none flex items-center shrink-0 mr-1.5">
                    <span className="text-emerald-400 font-bold">guest@flowshift</span>
                    <span className="text-slate-500">:</span>
                    <span className="text-cyan-400 font-bold">~</span>
                    <span className="text-slate-300 font-bold ml-1">$</span>
                  </span>
                  <div className="flex-1 flex items-center relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isExecuting ? 'Program executing...' : 'Type "run", "help", or any command...'}
                      disabled={isExecuting}
                      className="w-full bg-transparent text-slate-100 font-medium focus:outline-none font-mono text-xs placeholder:text-slate-600 disabled:opacity-50"
                    />
                    {!isExecuting && (
                      <span className="w-2 h-4 bg-cyan-400 animate-pulse ml-0.5 shrink-0 select-none"></span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div ref={terminalEndRef} />
          </div>

          {/* Quick Helper Bar */}
          <div className="pt-2 mt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span>Enter: Submit</span>
              <span>↑/↓: History</span>
              <span>Ctrl+C: Stop</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendTerminalInput('run');
                }}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                [run]
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendTerminalInput('help');
                }}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                [help]
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearTerminal();
                }}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                [clear]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
