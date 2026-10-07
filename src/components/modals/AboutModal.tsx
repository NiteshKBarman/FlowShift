import React, { useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Compact Logo Badge */}
        <div className="w-20 h-20 mx-auto mb-3.5 bg-slate-950 rounded-2xl p-2.5 shadow-xl shadow-cyan-500/10 border border-slate-700/60 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="FlowShift Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title & Tagline */}
        <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
          <span>FlowShift Studio</span>
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </h3>
        <p className="text-xs font-semibold text-cyan-400 mt-1">
          Code &rarr; Flowchart &rarr; Execute &rarr; Learn
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Interactive Developer Learning Platform
        </p>

        {/* Language Badges */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-950/80 text-blue-400 border border-blue-800/50 font-mono font-semibold">
            C
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-400 border border-purple-800/50 font-mono font-semibold">
            C++
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono font-semibold">
            Python
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/50 font-mono font-semibold">
            Java
          </span>
        </div>

        {/* Highlights List */}
        <div className="mt-4 space-y-1.5 text-left text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-sans">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>100% Client-side local execution</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Visual AST and Flowchart synthesis</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Step-by-step memory & stack debugger</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          FlowShift is an open educational studio built for exploring code structure, visual flowcharts, and execution step dynamics.
        </p>

        {/* Action button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
