import React, { useEffect } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { CodeEditor } from '../editor/CodeEditor';
import { FlowchartViewer } from '../flowchart/FlowchartViewer';
import { VariablesAndStackPanel } from './VariablesAndStackPanel';
import { ExecutionConsole } from './ExecutionConsole';
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel';
import { ExecutionControlsBar } from './ExecutionControlsBar';
import { ExecutionInputModal } from './ExecutionInputModal';

export const ExecutionStudio: React.FC = () => {
  const { initVisualExecution, visualEngine } = useEditorStore();

  useEffect(() => {
    if (!visualEngine) {
      initVisualExecution();
    }
  }, [initVisualExecution, visualEngine]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Upper Area: Code | Flowchart | Variables & Stack (62% height) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row border-b border-slate-800">
        {/* Left Column: Code Editor (33% width on desktop) */}
        <div className="w-full lg:w-[33%] h-1/3 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          <CodeEditor />
        </div>

        {/* Center Column: Interactive Flowchart Viewer (42% width on desktop) */}
        <div className="w-full lg:w-[42%] h-1/3 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          <FlowchartViewer />
        </div>

        {/* Right Column: Variables & Call Stack (25% width on desktop) */}
        <div className="w-full lg:w-[25%] h-1/3 lg:h-full relative overflow-hidden">
          <VariablesAndStackPanel />
        </div>
      </div>

      {/* Lower Area: Console Output | Execution History (38% height) */}
      <div className="h-44 sm:h-52 md:h-56 min-h-[140px] flex flex-col md:flex-row border-b border-slate-800">
        {/* Lower Left: Console Output */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full">
          <ExecutionConsole />
        </div>

        {/* Lower Right: Execution History */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full">
          <ExecutionHistoryPanel />
        </div>
      </div>

      {/* Bottom Floating Bar: Controls (Run | Pause | Step | Reset | Speed) */}
      <ExecutionControlsBar />

      {/* Interactive Input Prompt Modal */}
      <ExecutionInputModal />
    </div>
  );
};
