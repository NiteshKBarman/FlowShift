import React, { useRef, useEffect, useState } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore, type SupportedLanguage } from '../../store/editor-store';
import {
  FileCode2,
  Copy,
  Check,
} from 'lucide-react';

interface CodeEditorProps {
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ readOnly = false }) => {
  const {
    sourceCode,
    sourceLanguage,
    setSourceCode,
    highlightedLines,
    diagnostics,
  } = useEditorStore();

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fileNames: Record<SupportedLanguage, string> = {
    c: 'main.c',
    cpp: 'main.cpp',
    python: 'main.py',
    java: 'Main.java',
  };

  const languageBadges: Record<SupportedLanguage, { label: string; color: string }> = {
    c: { label: 'C', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
    cpp: { label: 'C++', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
    python: { label: 'Python', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    java: { label: 'Java', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  };

  const currentBadge = languageBadges[sourceLanguage] || languageBadges.c;
  const currentFileName = fileNames[sourceLanguage] || 'main.c';

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom sleek dark IDE theme
    monaco.editor.defineTheme('flowshift-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '818cf8' },
        { token: 'identifier', foreground: 'e2e8f0' },
        { token: 'operator', foreground: '94a3b8' },
      ],
      colors: {
        'editor.background': '#020617', // slate-950
        'editor.foreground': '#f1f5f9',
        'editor.lineHighlightBackground': '#0f172a80',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editor.selectionBackground': '#38bdf833',
        'editorGutter.background': '#020617',
        'editorCursor.foreground': '#38bdf8',
      },
    });

    monaco.editor.setTheme('flowshift-dark');
  };

  // Synchronize bidirectional line highlights from flowchart node selection / visual execution
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (highlightedLines.length > 0) {
      const newDecorations: monacoEditor.editor.IModelDeltaDecoration[] = highlightedLines.map(
        (line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'bg-cyan-500/20 border-l-2 border-cyan-400 shadow-inner',
            glyphMarginClassName: 'bg-cyan-400 rounded-full',
          },
        })
      );

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );

      // Smoothly scroll to reveal the first highlighted line
      editor.revealLineInCenterIfOutsideViewport(highlightedLines[0]);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [highlightedLines]);

  // Set diagnostic squigglies
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: monacoEditor.editor.IMarkerData[] = diagnostics
      .filter((d) => d.sourceLocation && (d.severity === 'error' || d.severity === 'warning'))
      .map((d) => ({
        severity:
          d.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: d.message,
        startLineNumber: d.sourceLocation!.startLine,
        startColumn: d.sourceLocation!.startColumn || 1,
        endLineNumber: d.sourceLocation!.endLine || d.sourceLocation!.startLine,
        endColumn: d.sourceLocation!.endColumn || 80,
      }));

    monaco.editor.setModelMarkers(model, 'flowshift', markers);
  }, [diagnostics]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = sourceCode.split('\n').length;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* IDE Tab Header */}
      <div className="h-10 border-b border-slate-800 bg-slate-900/90 px-3 sm:px-4 flex items-center justify-between z-10 select-none">
        {/* Left: Tab with file name & badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg shadow-sm">
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-xs font-semibold text-slate-200">
              {currentFileName}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${currentBadge.color}`}
            >
              {currentBadge.label}
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Right: Actions (Copy & Run) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title="Copy source code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language={sourceLanguage}
          value={sourceCode}
          theme="flowshift-dark"
          onChange={(val) => setSourceCode(val || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: window.innerWidth < 640 ? 12 : 13,
            lineHeight: window.innerWidth < 640 ? 20 : 22,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  );
};
