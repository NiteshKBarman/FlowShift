/**
 * Quiz and Practice Mode Types for FlowShift.
 */

import type { SupportedLanguage } from '../../store/editor-store';
import type { FlowGraph } from '../flow/flow-types';

export type QuizTopic =
  | 'variables'
  | 'conditions'
  | 'loops'
  | 'functions'
  | 'recursion'
  | 'arrays'
  | 'algorithms'
  | 'mixed';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizLanguageFilter = SupportedLanguage | 'any';

export type QuizQuestionType =
  | 'predict-output'
  | 'predict-variable'
  | 'next-step'
  | 'flowchart-path'
  | 'find-error'
  | 'recursion'
  | 'time-complexity'
  | 'mcq';

export interface QuizQuestion {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly topic: QuizTopic;
  readonly difficulty: QuizDifficulty;
  readonly language: SupportedLanguage | 'pseudocode' | 'general';
  readonly questionType: QuizQuestionType;
  readonly codeSnippet?: string;
  readonly flowGraph?: FlowGraph;
  readonly options: string[];
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly stepDetails?: string[];
  readonly errorLine?: number;
  readonly hints?: string[];
}

export interface PracticeSessionState {
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  history: {
    questionId: string;
    topic: QuizTopic;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
  }[];
}

export interface UserProgressData {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  bestStreak: number;
  topicPerformance: Record<string, { total: number; correct: number }>;
  difficultyPerformance: Record<string, { total: number; correct: number }>;
}

export interface QuizFilterOptions {
  topic: QuizTopic;
  difficulty: QuizDifficulty | 'all';
  language: QuizLanguageFilter;
  questionType: QuizQuestionType | 'all';
}
