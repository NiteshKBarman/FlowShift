import React, { useEffect, useState } from 'react';
import { useEditorStore } from './store/editor-store';
import { HeaderToolbar } from './components/toolbar/HeaderToolbar';
import { CodeEditor } from './components/editor/CodeEditor';
import { FlowchartViewer } from './components/flowchart/FlowchartViewer';
import { TranslationPanel } from './components/translation/TranslationPanel';
import { DiagnosticsDrawer } from './components/panels/DiagnosticsDrawer';
import { NodeDetailPanel } from './components/panels/NodeDetailPanel';
import {
  Layers,
  ArrowRightLeft,
  FileCode,
  Columns,
  Languages,
} from 'lucide-react';

export const App: React.FC = () => {
  const { activeView, setActiveView, runPipeline } = useEditorStore();
  const [splitRightTab, setSplitRightTab] = useState<'flow' | 'translate'>('flow');

  useEffect(() => {
    // Initial run on mount
    runPipeline();
  }, [runPipeline]);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header Toolbar */}
      <HeaderToolbar />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full min-h-0 flex relative overflow-hidden pb-14 md:pb-0">
        {/* Split Studio Mode */}
        {activeView === 'split' && (
          <div className="w-full h-full flex flex-col md:flex-row">
            {/* Left Column: Monaco Code Editor */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
              <CodeEditor />
            </div>

            {/* Right Column: Toggleable Flowchart or Translation Panel */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col relative">
              {/* Right column tab switcher */}
              <div className="absolute right-3 sm:right-4 top-2 z-20 flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 backdrop-blur-md shadow-md">
                <button
                  onClick={() => setSplitRightTab('flow')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                    splitRightTab === 'flow'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Flowchart</span>
                </button>
                <button
                  onClick={() => setSplitRightTab('translate')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                    splitRightTab === 'translate'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Translation</span>
                </button>
              </div>

              {splitRightTab === 'flow' ? <FlowchartViewer /> : <TranslationPanel />}
              {splitRightTab === 'flow' && <NodeDetailPanel />}
            </div>
          </div>
        )}

        {/* Pure Code View Mode */}
        {activeView === 'code' && (
          <div className="w-full h-full relative">
            <CodeEditor />
          </div>
        )}

        {/* Pure Flowchart View Mode */}
        {activeView === 'flowchart' && (
          <div className="w-full h-full relative">
            <FlowchartViewer />
            <NodeDetailPanel />
          </div>
        )}

        {/* Pure Translation Mode (Side by Side Source & Target) */}
        {activeView === 'translate' && (
          <div className="w-full h-full flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
              <CodeEditor />
            </div>
            <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
              <TranslationPanel />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablets < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl z-30 flex items-center justify-around px-2 select-none shadow-lg">
        <button
          onClick={() => setActiveView('code')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 text-[11px] font-medium transition-colors ${
            activeView === 'code' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Code</span>
        </button>

        <button
          onClick={() => setActiveView('flowchart')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 text-[11px] font-medium transition-colors ${
            activeView === 'flowchart' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Flowchart</span>
        </button>

        <button
          onClick={() => setActiveView('translate')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 text-[11px] font-medium transition-colors ${
            activeView === 'translate' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>Translate</span>
        </button>

        <button
          onClick={() => setActiveView('split')}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 text-[11px] font-medium transition-colors ${
            activeView === 'split' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Columns className="w-4 h-4" />
          <span>Split</span>
        </button>
      </nav>

      {/* Diagnostics Drawer (Above mobile nav on mobile) */}
      <div className="pb-14 md:pb-0">
        <DiagnosticsDrawer />
      </div>
    </div>
  );
};

export default App;
