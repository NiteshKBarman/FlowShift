import React from 'react';
import type { PracticeSessionState } from '../../core/quiz/quiz-types';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  BarChart3,
  Flame,
  AlertTriangle,
} from 'lucide-react';

interface PracticeSummaryCardProps {
  session: PracticeSessionState;
  onTryAgain: () => void;
  onNewPractice: () => void;
  onOpenDashboard: () => void;
}

export const PracticeSummaryCard: React.FC<PracticeSummaryCardProps> = ({
  session,
  onTryAgain,
  onNewPractice,
  onOpenDashboard,
}) => {
  // Identify topics needing improvement (topics where user got questions wrong)
  const topicMistakes: Record<string, { total: number; incorrect: number }> = {};
  for (const item of session.history) {
    if (!topicMistakes[item.topic]) {
      topicMistakes[item.topic] = { total: 0, incorrect: 0 };
    }
    topicMistakes[item.topic].total += 1;
    if (!item.isCorrect) {
      topicMistakes[item.topic].incorrect += 1;
    }
  }

  const topicsToImprove: { topic: string; incorrect: number }[] = Object.entries(topicMistakes)
    .filter(([_, stats]) => stats.incorrect > 0)
    .map(([topic, stats]) => ({ topic, incorrect: stats.incorrect }))
    .sort((a, b) => b.incorrect - a.incorrect);

  const formatTopicName = (t: string) => {
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const isPerfect = session.wrongAnswers === 0 && session.questionsAnswered > 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
          {isPerfect ? (
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          ) : (
            <Trophy className="w-8 h-8 text-indigo-400" />
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Practice Complete
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {isPerfect
            ? 'Outstanding work! Flawless execution across all questions.'
            : 'Well done! Review your results below to strengthen key areas.'}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Score
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {session.correctAnswers} <span className="text-sm text-slate-500 font-normal">/ {session.questionsAnswered}</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Accuracy
          </div>
          <div
            className={`text-2xl font-bold ${
              session.accuracy >= 80
                ? 'text-emerald-400'
                : session.accuracy >= 50
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {session.accuracy}%
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Correct
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {session.correctAnswers}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Incorrect
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {session.wrongAnswers}
          </div>
        </div>
      </div>

      {/* Best Streak Banner */}
      {session.bestStreak > 1 && (
        <div className="mb-8 flex items-center justify-between px-4 py-3 bg-amber-950/30 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-200">
              Session Peak Streak
            </span>
          </div>
          <span className="text-base font-bold text-amber-300">
            {session.bestStreak} questions in a row!
          </span>
        </div>
      )}

      {/* Topics to Improve Section */}
      <div className="mb-8 p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Topics to Improve
          </h3>
        </div>

        {topicsToImprove.length === 0 ? (
          <p className="text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            No weak topics identified in this session! Keep up the great work.
          </p>
        ) : (
          <div className="space-y-2">
            {topicsToImprove.map((item) => (
              <div
                key={item.topic}
                className="flex items-center justify-between py-1.5 px-3 bg-slate-900/60 rounded-lg border border-slate-800 text-sm"
              >
                <span className="font-medium text-slate-200">
                  {formatTopicName(item.topic)}
                </span>
                <span className="text-xs text-rose-400 font-semibold">
                  {item.incorrect} incorrect {item.incorrect === 1 ? 'answer' : 'answers'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onTryAgain}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>

        <button
          onClick={onNewPractice}
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Sparkles className="w-4 h-4" />
          New Practice Session
        </button>

        <button
          onClick={onOpenDashboard}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-slate-800"
        >
          <BarChart3 className="w-4 h-4 text-slate-400" />
          View All Progress
        </button>
      </div>
    </div>
  );
};
