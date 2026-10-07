import React from 'react';
import type {
  QuizFilterOptions,
  QuizTopic,
  QuizDifficulty,
  QuizQuestionType,
  QuizLanguageFilter,
  PracticeSessionState,
} from '../../core/quiz/quiz-types';
import {
  Filter,
  Flame,
  Award,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface PracticeFiltersBarProps {
  filters: QuizFilterOptions;
  session: PracticeSessionState;
  onFilterChange: (newFilters: QuizFilterOptions) => void;
  onOpenDashboard: () => void;
  onNewSession: () => void;
}

export const PracticeFiltersBar: React.FC<PracticeFiltersBarProps> = ({
  filters,
  session,
  onFilterChange,
  onOpenDashboard,
  onNewSession,
}) => {
  const topics: { id: QuizTopic; label: string }[] = [
    { id: 'mixed', label: 'All Topics' },
    { id: 'variables', label: 'Variables' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'loops', label: 'Loops' },
    { id: 'functions', label: 'Functions' },
    { id: 'recursion', label: 'Recursion' },
    { id: 'arrays', label: 'Arrays' },
    { id: 'algorithms', label: 'Algorithms' },
  ];

  const difficulties: { id: QuizDifficulty | 'all'; label: string }[] = [
    { id: 'all', label: 'All Levels' },
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
  ];

  const languages: { id: QuizLanguageFilter; label: string }[] = [
    { id: 'any', label: 'Any Lang' },
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
  ];

  const questionTypes: { id: QuizQuestionType | 'all'; label: string }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'predict-output', label: 'Predict Output' },
    { id: 'predict-variable', label: 'Predict Variable' },
    { id: 'next-step', label: 'Next Step' },
    { id: 'flowchart-path', label: 'Flowchart Path' },
    { id: 'find-error', label: 'Find Error' },
    { id: 'recursion', label: 'Recursion' },
    { id: 'time-complexity', label: 'Complexity' },
    { id: 'mcq', label: 'Concepts MCQ' },
  ];

  return (
    <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
      {/* Left: Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        {/* Topic Filter */}
        <select
          value={filters.topic}
          onChange={(e) =>
            onFilterChange({ ...filters, topic: e.target.value as QuizTopic })
          }
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
              {t.label}
            </option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          value={filters.difficulty}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              difficulty: e.target.value as QuizDifficulty | 'all',
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          {difficulties.map((d) => (
            <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
              {d.label}
            </option>
          ))}
        </select>

        {/* Language Filter */}
        <select
          value={filters.language}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              language: e.target.value as QuizLanguageFilter,
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id} className="bg-slate-900 text-slate-200">
              {l.label}
            </option>
          ))}
        </select>

        {/* Question Type Filter */}
        <select
          value={filters.questionType}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              questionType: e.target.value as QuizQuestionType | 'all',
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          {questionTypes.map((q) => (
            <option key={q.id} value={q.id} className="bg-slate-900 text-slate-200">
              {q.label}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Live Session Statistics & Action Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Score & Accuracy Badges */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Score:</span>
          <span className="text-white font-bold">{session.correctAnswers}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{session.questionsAnswered}</span>
          <span className="text-slate-600 ml-1">•</span>
          <span className="text-cyan-400 font-bold ml-1">
            {session.questionsAnswered > 0 ? `${session.accuracy}%` : '100%'}
          </span>
        </div>

        {/* Current Streak */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
            session.currentStreak > 0
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
              : 'bg-slate-950 border-slate-800 text-slate-500'
          }`}
          title="Current Correct Streak"
        >
          <Flame
            className={`w-3.5 h-3.5 ${
              session.currentStreak > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
            }`}
          />
          <span>{session.currentStreak}</span>
        </div>

        {/* Dashboard Modal Button */}
        <button
          onClick={onOpenDashboard}
          className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="View Overall Progress Dashboard"
        >
          <BarChart3 className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Reset Session Button */}
        <button
          onClick={onNewSession}
          className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Start Fresh Practice Session"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
