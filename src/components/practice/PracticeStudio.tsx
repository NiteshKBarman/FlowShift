import React, { useState } from 'react';
import type {
  QuizFilterOptions,
  PracticeSessionState,
  QuizQuestion,
  UserProgressData,
} from '../../core/quiz/quiz-types';
import {
  generateQuestion,
} from '../../core/quiz/question-generator';
import {
  loadUserProgress,
  createInitialSessionState,
  recordSessionAnswer,
  resetUserProgress,
} from '../../core/quiz/progress-storage';
import { PracticeFiltersBar } from './PracticeFiltersBar';
import { QuestionCard } from './QuestionCard';
import { PracticeSummaryCard } from './PracticeSummaryCard';
import { ProgressDashboardModal } from './ProgressDashboardModal';
import { Flag } from 'lucide-react';

const SESSION_QUESTION_GOAL = 10;

export const PracticeStudio: React.FC = () => {
  const [filters, setFilters] = useState<QuizFilterOptions>({
    topic: 'mixed',
    difficulty: 'all',
    language: 'any',
    questionType: 'all',
  });

  const [session, setSession] = useState<PracticeSessionState>(() => createInitialSessionState());
  const [userProgress, setUserProgress] = useState<UserProgressData>(() => loadUserProgress());
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(() =>
    generateQuestion({
      topic: 'mixed',
      difficulty: 'all',
      language: 'any',
      questionType: 'all',
    })
  );
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [showDashboard, setShowDashboard] = useState<boolean>(false);

  // Generate a new question when filters change
  const handleFilterChange = (newFilters: QuizFilterOptions) => {
    setFilters(newFilters);
    const q = generateQuestion(newFilters);
    setCurrentQuestion(q);
  };

  const handleAnswerSubmit = (userAnswer: string) => {
    if (!currentQuestion) return;

    const { session: newSession } = recordSessionAnswer(
      session,
      currentQuestion,
      userAnswer
    );
    setSession(newSession);
    setUserProgress(loadUserProgress());
  };

  const handleNextQuestion = () => {
    if (session.questionsAnswered >= SESSION_QUESTION_GOAL) {
      setIsSessionComplete(true);
      return;
    }

    const nextQ = generateQuestion(filters);
    setCurrentQuestion(nextQ);
  };

  const handleNewSession = () => {
    setSession(createInitialSessionState());
    setIsSessionComplete(false);
    setCurrentQuestion(generateQuestion(filters));
  };

  const handleTryAgain = () => {
    setSession(createInitialSessionState());
    setIsSessionComplete(false);
    setCurrentQuestion(generateQuestion(filters));
  };

  const handleFinishEarly = () => {
    if (session.questionsAnswered > 0) {
      setIsSessionComplete(true);
    }
  };

  const handleResetLifetimeProgress = () => {
    const fresh = resetUserProgress();
    setUserProgress(fresh);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Filter & Status Bar */}
      <PracticeFiltersBar
        filters={filters}
        session={session}
        onFilterChange={handleFilterChange}
        onOpenDashboard={() => setShowDashboard(true)}
        onNewSession={handleNewSession}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col items-center">
        {/* Subheader / Session Progress tracker */}
        {!isSessionComplete && (
          <div className="w-full flex items-center justify-between mb-5 px-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">
                Question {session.questionsAnswered + 1} of {SESSION_QUESTION_GOAL}
              </span>
              <div className="hidden sm:flex items-center gap-1 ml-2">
                {Array.from({ length: SESSION_QUESTION_GOAL }).map((_, idx) => {
                  const historyItem = session.history[idx];
                  let statusColor = 'bg-slate-800';
                  if (historyItem) {
                    statusColor = historyItem.isCorrect ? 'bg-emerald-500' : 'bg-rose-500';
                  } else if (idx === session.questionsAnswered) {
                    statusColor = 'bg-indigo-500 animate-pulse';
                  }
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-1.5 rounded-full transition-all duration-200 ${statusColor}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session.questionsAnswered > 0 && (
                <button
                  onClick={handleFinishEarly}
                  className="hover:text-slate-200 underline transition-colors flex items-center gap-1"
                >
                  <Flag className="w-3 h-3" />
                  Finish Early
                </button>
              )}
              <span className="text-slate-500">•</span>
              <span>
                Score: <strong className="text-indigo-400">{session.score}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Content: Either Summary or Question Card */}
        {isSessionComplete ? (
          <PracticeSummaryCard
            session={session}
            onTryAgain={handleTryAgain}
            onNewPractice={handleNewSession}
            onOpenDashboard={() => setShowDashboard(true)}
          />
        ) : currentQuestion ? (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswerSubmit={handleAnswerSubmit}
            onNextQuestion={handleNextQuestion}
          />
        ) : (
          <div className="p-8 text-center text-slate-400">
            Generating question...
          </div>
        )}
      </main>

      {/* Progress Dashboard Modal */}
      <ProgressDashboardModal
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        progress={userProgress}
        onResetProgress={handleResetLifetimeProgress}
      />
    </div>
  );
};
