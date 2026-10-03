import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore } from '../../store/editor-store';
import { FileCode2, Copy, Check } from 'lucide-react';

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
  const [copied, setCopied] = React.useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom sleek dark theme
    monaco.editor.defineTheme('flowshift-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '818cf8' },
      ],
      colors: {
        'editor.background': '#020617', // slate-950
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#0f172a66',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editor.selectionBackground': '#38bdf833',
        'editorGutter.background': '#020617',
      },
    });

    monaco.editor.setTheme('flowshift-dark');
  };

  // Synchronize bidirectional line highlights from flowchart node selection
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
            className: 'bg-cyan-500/15 border-l-2 border-cyan-400',
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
      .filter((d) => d.sourceLocation)
      .map((d) => ({
        severity:
          d.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : d.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.sourceLocation!.startLine,
        startColumn: d.sourceLocation!.startColumn || 1,
        endLineNumber: d.sourceLocation!.endLine || d.sourceLocation!.startLine,
        endColumn: d.sourceLocation!.endColumn || 80,
      }));

    monaco.editor.setModelMarkers(model, 'flowshift-diagnostics', markers);
  }, [diagnostics]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Editor Sub-header */}
      <div className="h-10 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <FileCode2 className="w-4 h-4 text-cyan-400" />
          <span className="font-mono uppercase">{sourceLanguage} Source</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {sourceCode.split('\n').length} lines
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="p-1 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
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
            fontSize: 13,
            lineHeight: 22,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
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
