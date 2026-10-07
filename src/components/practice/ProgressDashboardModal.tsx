import React from 'react';
import type { UserProgressData } from '../../core/quiz/quiz-types';
import {
  X,
  Award,
  Flame,
  CheckCircle2,
  BarChart2,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface ProgressDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgressData;
  onResetProgress: () => void;
}

export const ProgressDashboardModal: React.FC<ProgressDashboardModalProps> = ({
  isOpen,
  onClose,
  progress,
  onResetProgress,
}) => {
  if (!isOpen) return null;

  const topicsList = [
    { key: 'variables', label: 'Variables' },
    { key: 'conditions', label: 'Conditions' },
    { key: 'loops', label: 'Loops' },
    { key: 'functions', label: 'Functions' },
    { key: 'recursion', label: 'Recursion' },
    { key: 'arrays', label: 'Arrays' },
    { key: 'algorithms', label: 'Algorithms' },
  ];

  const difficultyList = [
    { key: 'easy', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'hard', label: 'Hard' },
  ];

  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all your practice progress statistics? This action cannot be undone.'
      )
    ) {
      onResetProgress();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Practice Progress</h3>
              <p className="text-xs text-slate-400">
                Lifetime statistics tracked in your browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top High-level stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Accuracy
              </div>
              <div
                className={`text-2xl font-bold ${
                  progress.accuracy >= 80
                    ? 'text-emerald-400'
                    : progress.accuracy >= 50
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                {progress.totalQuestions > 0 ? `${progress.accuracy}%` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {progress.correct} / {progress.totalQuestions} correct
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Solved
              </div>
              <div className="text-2xl font-bold text-indigo-400">
                {progress.totalQuestions}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Questions answered
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Best Streak
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {progress.bestStreak}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Consecutive correct
              </div>
            </div>
          </div>

          {/* Topic Performance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              Topic Performance
            </h4>

            <div className="space-y-2.5">
              {topicsList.map(({ key, label }) => {
                const stats = progress.topicPerformance[key] || { total: 0, correct: 0 };
                const pct =
                  stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

                return (
                  <div
                    key={key}
                    className="p-2.5 bg-slate-950/40 border border-slate-800/70 rounded-xl flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">
                          {stats.correct}/{stats.total}
                        </span>
                        <span
                          className={`font-bold w-12 text-right ${
                            pct === null
                              ? 'text-slate-500'
                              : pct >= 80
                              ? 'text-emerald-400'
                              : pct >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {pct !== null ? `${pct}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct === null
                            ? 'w-0'
                            : pct >= 80
                            ? 'bg-emerald-500'
                            : pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: pct !== null ? `${pct}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Performance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Difficulty Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {difficultyList.map(({ key, label }) => {
                const stats = progress.difficultyPerformance[key] || { total: 0, correct: 0 };
                const pct =
                  stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

                return (
                  <div
                    key={key}
                    className="p-2.5 bg-slate-950/40 border border-slate-800/70 rounded-xl text-center"
                  >
                    <div className="text-xs font-medium text-slate-300 mb-1">{label}</div>
                    <div
                      className={`text-base font-bold ${
                        pct === null
                          ? 'text-slate-500'
                          : pct >= 80
                          ? 'text-emerald-400'
                          : pct >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {pct !== null ? `${pct}%` : '—'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {stats.correct}/{stats.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs text-rose-400/80 hover:text-rose-400 hover:underline flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Progress
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
