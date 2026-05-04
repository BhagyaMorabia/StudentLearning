import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  MasteryScore,
  QuizSession,
  QuizQuestion,
  LearningPath,
  WrongAnswer,
  Question,
  QuizResults,
} from "./types";
import {
  calculateQuizResults,
  updateMasteryScore,
  calculateMarks,
  getWeakSubtopics,
} from "./mastery";

interface AppState {
  // Mastery tracking
  masteryScores: Record<string, MasteryScore>; // subtopicId → score
  
  // Active quiz
  activeQuiz: QuizSession | null;
  
  // Learning paths
  learningPaths: Record<string, LearningPath>; // chapterId → path
  
  // Wrong answer book
  wrongAnswers: WrongAnswer[];
  
  // Last quiz results
  lastResults: QuizResults | null;

  // Actions
  startQuiz: (
    chapterId: string,
    questions: Question[],
    sessionType: QuizSession["sessionType"]
  ) => void;
  answerQuestion: (answer: string, timeTaken: number) => void;
  skipQuestion: (timeTaken: number) => void;
  completeQuiz: (subtopicMap: Record<string, string>) => QuizResults;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  
  updateLearningPath: (chapterId: string, path: Partial<LearningPath>) => void;
  resetChapterMastery: (chapterId: string, subtopicIds: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      masteryScores: {},
      activeQuiz: null,
      learningPaths: {},
      wrongAnswers: [],
      lastResults: null,

      startQuiz: (chapterId, questions, sessionType) => {
        const quizQuestions: QuizQuestion[] = questions.map((q) => ({
          question: q,
          userAnswer: undefined,
          isCorrect: undefined,
          isSkipped: false,
          marksAwarded: 0,
          timeTakenSeconds: 0,
        }));

        set({
          activeQuiz: {
            id: `quiz_${Date.now()}`,
            chapterId,
            sessionType,
            questions: quizQuestions,
            currentIndex: 0,
            startedAt: new Date().toISOString(),
            isCompleted: false,
          },
        });
      },

      answerQuestion: (answer, timeTaken) => {
        const { activeQuiz } = get();
        if (!activeQuiz) return;

        const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
        const { isCorrect, marks } = calculateMarks(currentQ.question, answer, false);

        const updatedQuestions = [...activeQuiz.questions];
        updatedQuestions[activeQuiz.currentIndex] = {
          ...currentQ,
          userAnswer: answer,
          isCorrect,
          isSkipped: false,
          marksAwarded: marks,
          timeTakenSeconds: timeTaken,
        };

        set({
          activeQuiz: {
            ...activeQuiz,
            questions: updatedQuestions,
          },
        });
      },

      skipQuestion: (timeTaken) => {
        const { activeQuiz } = get();
        if (!activeQuiz) return;

        const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
        const updatedQuestions = [...activeQuiz.questions];
        updatedQuestions[activeQuiz.currentIndex] = {
          ...currentQ,
          isSkipped: true,
          marksAwarded: 0,
          timeTakenSeconds: timeTaken,
        };

        set({
          activeQuiz: {
            ...activeQuiz,
            questions: updatedQuestions,
          },
        });
      },

      completeQuiz: (subtopicMap) => {
        const { activeQuiz, masteryScores, wrongAnswers } = get();
        if (!activeQuiz) throw new Error("No active quiz");

        // Calculate results
        const results = calculateQuizResults(
          activeQuiz.id,
          activeQuiz.questions,
          activeQuiz.questions.map((q) => q.question),
          subtopicMap
        );

        // Update mastery scores
        const newMasteryScores = { ...masteryScores };
        for (const sr of results.subtopicResults) {
          newMasteryScores[sr.subtopicId] = updateMasteryScore(
            newMasteryScores[sr.subtopicId] || null,
            sr
          );
        }

        // Update wrong answer book
        const newWrongAnswers = [...wrongAnswers];
        for (const qq of activeQuiz.questions) {
          if (qq.isCorrect === false && !qq.isSkipped) {
            const existing = newWrongAnswers.find(
              (w) => w.questionId === qq.question.id
            );
            if (existing) {
              existing.attemptCount++;
              existing.wrongAnswer = qq.userAnswer || "";
              existing.lastWrongAt = new Date().toISOString();
              existing.isResolved = false;
            } else {
              newWrongAnswers.push({
                questionId: qq.question.id,
                wrongAnswer: qq.userAnswer || "",
                correctAnswer: qq.question.correctAnswer,
                attemptCount: 1,
                isResolved: false,
                lastWrongAt: new Date().toISOString(),
              });
            }
          } else if (qq.isCorrect === true) {
            // Mark as resolved in wrong answer book if previously wrong
            const existing = newWrongAnswers.find(
              (w) => w.questionId === qq.question.id
            );
            if (existing) {
              existing.isResolved = true;
            }
          }
        }

        // Update learning path
        const weakIds = getWeakSubtopics(Object.values(newMasteryScores));
        const learningPaths = { ...get().learningPaths };
        learningPaths[activeQuiz.chapterId] = {
          chapterId: activeQuiz.chapterId,
          phase: weakIds.length > 0 ? "remediation" : "mastered",
          weakSubtopicIds: weakIds,
          completedSubtopicIds: results.masteredSubtopics.map((s) => s.subtopicId),
        };

        set({
          activeQuiz: {
            ...activeQuiz,
            isCompleted: true,
            completedAt: new Date().toISOString(),
          },
          masteryScores: newMasteryScores,
          wrongAnswers: newWrongAnswers,
          learningPaths,
          lastResults: results,
        });

        return results;
      },

      nextQuestion: () => {
        const { activeQuiz } = get();
        if (!activeQuiz) return;
        if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
          set({
            activeQuiz: {
              ...activeQuiz,
              currentIndex: activeQuiz.currentIndex + 1,
            },
          });
        }
      },

      previousQuestion: () => {
        const { activeQuiz } = get();
        if (!activeQuiz) return;
        if (activeQuiz.currentIndex > 0) {
          set({
            activeQuiz: {
              ...activeQuiz,
              currentIndex: activeQuiz.currentIndex - 1,
            },
          });
        }
      },

      goToQuestion: (index) => {
        const { activeQuiz } = get();
        if (!activeQuiz) return;
        if (index >= 0 && index < activeQuiz.questions.length) {
          set({
            activeQuiz: {
              ...activeQuiz,
              currentIndex: index,
            },
          });
        }
      },

      updateLearningPath: (chapterId, path) => {
        const { learningPaths } = get();
        const defaultPath: LearningPath = {
          chapterId,
          phase: "learning",
          weakSubtopicIds: [],
          completedSubtopicIds: [],
        };

        set({
          learningPaths: {
            ...learningPaths,
            [chapterId]: {
              ...defaultPath,
              ...learningPaths[chapterId],
              ...path,
              chapterId,
            },
          },
        });
      },

      resetChapterMastery: (chapterId, subtopicIds) => {
        const { masteryScores, learningPaths } = get();
        const newScores = { ...masteryScores };
        for (const id of subtopicIds) {
          delete newScores[id];
        }
        const newPaths = { ...learningPaths };
        delete newPaths[chapterId];
        set({ masteryScores: newScores, learningPaths: newPaths });
      },
    }),
    {
      name: "mastery-ai-storage",
      partialize: (state) => ({
        masteryScores: state.masteryScores,
        learningPaths: state.learningPaths,
        wrongAnswers: state.wrongAnswers,
      }),
    }
  )
);
