import React from 'react';
import { VariablesPanel } from './VariablesPanel';
import { CallStackPanel } from './CallStackPanel';

export const VariablesAndStackPanel: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950 border-l border-slate-800/80 overflow-hidden">
      {/* Upper Half: Variables */}
      <div className="h-1/2 min-h-0 flex flex-col overflow-hidden">
        <VariablesPanel />
      </div>

      {/* Lower Half: Call Stack */}
      <div className="h-1/2 min-h-0 flex flex-col overflow-hidden">
        <CallStackPanel />
      </div>
    </div>
  );
};
