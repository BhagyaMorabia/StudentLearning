// Type definitions for the entire application
// These types mirror the DB schema and will be used with Drizzle + Neon later

export type MasteryStatus = "not_started" | "weak" | "learning" | "mastered";
export type QuestionType = "mcq_single" | "mcq_multiple" | "numerical" | "assertion_reasoning" | "match_the_following" | "integer_type";
export type LearningPhase = "learning" | "testing" | "remediation" | "mastered";
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Subject {
  id: string;
  name: string;
  grade: number;
  description: string;
  icon: string;
  isActive: boolean;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  orderIndex: number;
  estimatedHours: number;
  isActive: boolean;
}

export interface Subtopic {
  id: string;
  chapterId: string;
  name: string;
  orderIndex: number;
  contentMarkdown: string;
  diagramMermaid?: string;
  flowchartMermaid?: string;
  formulasLatex: string[];
  keyPoints: string[];
  commonMistakes: string[];
  difficultyLevel: Difficulty;
  estimatedMinutes: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subtopicId: string;
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string;
  explanationMarkdown: string;
  difficulty: Difficulty;
  positiveMarks: number;
  negativeMarks: number;
  timeExpectedSeconds: number;
  tags: string[];
}

export interface QuizSession {
  id: string;
  chapterId: string;
  sessionType: "practice" | "mastery_test" | "remediation" | "mock_jee";
  questions: QuizQuestion[];
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
  isCompleted: boolean;
}

export interface QuizQuestion {
  question: Question;
  userAnswer?: string;
  isCorrect?: boolean;
  isSkipped: boolean;
  marksAwarded: number;
  timeTakenSeconds: number;
}

export interface MasteryScore {
  subtopicId: string;
  score: number;
  totalAttempts: number;
  correctAttempts: number;
  streak: number;
  masteryStatus: MasteryStatus;
  lastTestedAt?: string;
}

export interface LearningPath {
  chapterId: string;
  currentSubtopicId?: string;
  phase: LearningPhase;
  weakSubtopicIds: string[];
  completedSubtopicIds: string[];
}

export interface WrongAnswer {
  questionId: string;
  wrongAnswer: string;
  correctAnswer: string;
  attemptCount: number;
  isResolved: boolean;
  lastWrongAt: string;
}

export interface SubtopicResult {
  subtopicId: string;
  subtopicName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  status: MasteryStatus;
}

export interface QuizResults {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  timeTaken: number;
  subtopicResults: SubtopicResult[];
  weakSubtopics: SubtopicResult[];
  masteredSubtopics: SubtopicResult[];
}
