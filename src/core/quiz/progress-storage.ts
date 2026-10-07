/**
 * Local Storage Persistence & Session Tracking for Practice Mode.
 */

import type {
  UserProgressData,
  PracticeSessionState,
  QuizQuestion,
  QuizTopic,
  QuizDifficulty,
} from './quiz-types';

const STORAGE_KEY = 'flowshift_practice_progress_v1';

export function getInitialProgress(): UserProgressData {
  return {
    totalQuestions: 0,
    correct: 0,
    incorrect: 0,
    accuracy: 0,
    bestStreak: 0,
    topicPerformance: {
      variables: { total: 0, correct: 0 },
      conditions: { total: 0, correct: 0 },
      loops: { total: 0, correct: 0 },
      functions: { total: 0, correct: 0 },
      recursion: { total: 0, correct: 0 },
      arrays: { total: 0, correct: 0 },
      algorithms: { total: 0, correct: 0 },
    },
    difficultyPerformance: {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    },
  };
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function loadUserProgress(): UserProgressData {
  try {
    const storage = getStorage();
    if (!storage) {
      return getInitialProgress();
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return getInitialProgress();
    const parsed = JSON.parse(raw);
    return {
      ...getInitialProgress(),
      ...parsed,
      topicPerformance: {
        ...getInitialProgress().topicPerformance,
        ...(parsed.topicPerformance || {}),
      },
      difficultyPerformance: {
        ...getInitialProgress().difficultyPerformance,
        ...(parsed.difficultyPerformance || {}),
      },
    };
  } catch {
    return getInitialProgress();
  }
}

export function saveUserProgress(data: UserProgressData): void {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

export function resetUserProgress(): UserProgressData {
  const initial = getInitialProgress();
  saveUserProgress(initial);
  return initial;
}

export function recordQuestionResult(
  topic: QuizTopic,
  difficulty: QuizDifficulty,
  isCorrect: boolean,
  currentStreak: number = 0
): UserProgressData {
  const progress = loadUserProgress();
  progress.totalQuestions += 1;
  if (isCorrect) {
    progress.correct += 1;
  } else {
    progress.incorrect += 1;
  }

  progress.accuracy = Math.round((progress.correct / progress.totalQuestions) * 100);

  if (currentStreak > progress.bestStreak) {
    progress.bestStreak = currentStreak;
  }

  // Topic tracking
  const topicKey = topic === 'mixed' ? 'algorithms' : topic;
  if (!progress.topicPerformance[topicKey]) {
    progress.topicPerformance[topicKey] = { total: 0, correct: 0 };
  }
  progress.topicPerformance[topicKey].total += 1;
  if (isCorrect) {
    progress.topicPerformance[topicKey].correct += 1;
  }

  // Difficulty tracking
  if (!progress.difficultyPerformance[difficulty]) {
    progress.difficultyPerformance[difficulty] = { total: 0, correct: 0 };
  }
  progress.difficultyPerformance[difficulty].total += 1;
  if (isCorrect) {
    progress.difficultyPerformance[difficulty].correct += 1;
  }

  saveUserProgress(progress);
  return progress;
}

export function createInitialSessionState(): PracticeSessionState {
  return {
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
    accuracy: 100,
    currentStreak: 0,
    bestStreak: 0,
    history: [],
  };
}

export function recordSessionAnswer(
  session: PracticeSessionState,
  question: QuizQuestion,
  userAnswer: string
): { session: PracticeSessionState; isCorrect: boolean } {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = question.correctAnswer.trim().toLowerCase();

  const isCorrect =
    normalizedUser === normalizedCorrect ||
    (normalizedUser.startsWith(normalizedCorrect) && normalizedCorrect.length <= 2);

  const newCurrentStreak = isCorrect ? session.currentStreak + 1 : 0;
  const newBestStreak = Math.max(session.bestStreak, newCurrentStreak);
  const questionsAnswered = session.questionsAnswered + 1;
  const correctAnswers = isCorrect ? session.correctAnswers + 1 : session.correctAnswers;
  const wrongAnswers = !isCorrect ? session.wrongAnswers + 1 : session.wrongAnswers;
  const accuracy = Math.round((correctAnswers / questionsAnswered) * 100);
  const score = correctAnswers * 10;

  const updatedSession: PracticeSessionState = {
    questionsAnswered,
    correctAnswers,
    wrongAnswers,
    score,
    accuracy,
    currentStreak: newCurrentStreak,
    bestStreak: newBestStreak,
    history: [
      ...session.history,
      {
        questionId: question.id,
        topic: question.topic,
        isCorrect,
        userAnswer,
        correctAnswer: question.correctAnswer,
      },
    ],
  };

  recordQuestionResult(question.topic, question.difficulty, isCorrect, newCurrentStreak);

  return { session: updatedSession, isCorrect };
}
