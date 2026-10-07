import React, { useState } from 'react';
import type { QuizQuestion } from '../../core/quiz/quiz-types';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Code2,
  HelpCircle,
  Lightbulb,
  Check,
} from 'lucide-react';

interface QuestionCardProps {
  question: QuizQuestion;
  onAnswerSubmit: (userAnswer: string) => void;
  onNextQuestion: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswerSubmit,
  onNextQuestion,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  const handleOptionClick = (opt: string) => {
    if (isSubmitted) return;
    setSelectedOption(opt);
    setCustomInput(opt);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitted) return;

    const answerToEvaluate = (selectedOption || customInput).trim();
    if (!answerToEvaluate) return;

    const normalizedUser = answerToEvaluate.toLowerCase();
    const normalizedCorrect = question.correctAnswer.trim().toLowerCase();

    const correct =
      normalizedUser === normalizedCorrect ||
      (normalizedUser.startsWith(normalizedCorrect) && normalizedCorrect.length <= 2);

    setIsCorrect(correct);
    setIsSubmitted(true);
    onAnswerSubmit(answerToEvaluate);
  };

  const difficultyColors = {
    easy: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    medium: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    hard: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-6 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Question Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Question Type Pill */}
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono shadow-sm">
            {question.title}
          </span>

          {/* Topic Pill */}
          <span className="text-[11px] font-semibold capitalize px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
            {question.topic}
          </span>

          {/* Difficulty Pill */}
          <span
            className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-xl border ${
              difficultyColors[question.difficulty]
            }`}
          >
            {question.difficulty}
          </span>
        </div>

        {/* Language Pill */}
        {question.language && (
          <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-xl bg-slate-950 text-slate-400 border border-slate-800">
            {question.language}
          </span>
        )}
      </div>

      {/* Question Prompt */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-snug">
          {question.prompt}
        </h3>
      </div>

      {/* Code Snippet Container if present */}
      {question.codeSnippet && (
        <div className="rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
          <div className="h-8 px-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Program Source</span>
            </div>
            {question.errorLine && isSubmitted && (
              <span className="text-rose-400 font-bold">
                Defect on Line {question.errorLine}
              </span>
            )}
          </div>
          <pre className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed selection:bg-cyan-500/30">
            <code>
              {question.codeSnippet.split('\n').map((line, idx) => (
                <div
                  key={idx}
                  className={`table-row ${
                    isSubmitted && question.errorLine === idx + 1
                      ? 'bg-rose-950/40 text-rose-300 font-semibold'
                      : ''
                  }`}
                >
                  <span className="table-cell pr-4 text-slate-600 select-none text-right w-8">
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}

      {/* Multiple Choice Options List */}
      <div className="space-y-2.5 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Select Your Answer:</span>
        </label>

        <div className="grid grid-cols-1 gap-2.5">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isChosen = selectedOption === opt;
            const isAnswerKey =
              opt.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

            let optStyle =
              'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-200';

            if (isSubmitted) {
              if (isAnswerKey) {
                optStyle =
                  'bg-emerald-950/60 border-emerald-500/70 text-emerald-200 font-bold shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40';
              } else if (isChosen && !isCorrect) {
                optStyle =
                  'bg-rose-950/60 border-rose-500/70 text-rose-200 line-through ring-1 ring-rose-500/40';
              } else {
                optStyle = 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60';
              }
            } else if (isChosen) {
              optStyle =
                'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400';
            }

            return (
              <button
                key={`${idx}-${opt}`}
                type="button"
                onClick={() => handleOptionClick(opt)}
                disabled={isSubmitted}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer disabled:cursor-default ${optStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${
                      isChosen
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="font-mono text-xs sm:text-sm break-words">{opt}</span>
                </div>

                {isSubmitted && isAnswerKey && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                )}
                {isSubmitted && isChosen && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Button: Submit Answer */}
      {!isSubmitted && (
        <div className="pt-2">
          <button
            onClick={() => handleSubmit()}
            disabled={!selectedOption && !customInput.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Submit Answer</span>
          </button>
        </div>
      )}

      {/* Post-submission Result & Explanation Section */}
      {isSubmitted && (
        <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Banner: Correct or Incorrect */}
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-lg shadow-rose-500/10'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-base">
                {isCorrect ? 'Correct Answer!' : 'Incorrect'}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {isCorrect
                  ? 'Great job! Your answer matches the evaluated execution.'
                  : `Expected: "${question.correctAnswer}".`}
              </p>
            </div>
          </div>

          {/* Educational Explanation Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Lightbulb className="w-4 h-4" />
              <span>Educational Explanation:</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-sans">
              {question.explanation}
            </p>

            {/* Step-by-step Trace Details if provided */}
            {question.stepDetails && question.stepDetails.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  Execution State Trace:
                </span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  {question.stepDetails.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-1.5">
                      <span className="text-cyan-400 font-bold">›</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next Question Button */}
          <button
            onClick={() => {
              setSelectedOption(null);
              setCustomInput('');
              setIsSubmitted(false);
              onNextQuestion();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
