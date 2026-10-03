import React, { useEffect, useState } from 'react';
import { useEditorStore } from './store/editor-store';
import { HeaderToolbar } from './components/toolbar/HeaderToolbar';
import { CodeEditor } from './components/editor/CodeEditor';
import { FlowchartViewer } from './components/flowchart/FlowchartViewer';
import { TranslationPanel } from './components/translation/TranslationPanel';
import { DiagnosticsDrawer } from './components/panels/DiagnosticsDrawer';
import { NodeDetailPanel } from './components/panels/NodeDetailPanel';
import { Layers, ArrowRightLeft } from 'lucide-react';

export const App: React.FC = () => {
  const { activeView, runPipeline } = useEditorStore();
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
      <main className="flex-1 w-full min-h-0 flex relative overflow-hidden">
        {/* Split Studio Mode */}
        {activeView === 'split' && (
          <div className="w-full h-full flex flex-col md:flex-row">
            {/* Left Column: Monaco Code Editor */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-slate-800 flex flex-col">
              <CodeEditor />
            </div>

            {/* Right Column: Toggleable Flowchart or Translation Panel */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col relative">
              {/* Right column tab switcher */}
              <div className="absolute right-4 top-2 z-20 flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 backdrop-blur-md shadow-md">
                <button
                  onClick={() => setSplitRightTab('flow')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
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
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-slate-800 flex flex-col">
              <CodeEditor />
            </div>
            <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
              <TranslationPanel />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Diagnostics Drawer */}
      <DiagnosticsDrawer />
    </div>
  );
};

export default App;
