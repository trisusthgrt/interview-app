export enum Difficulty {
  Easy = "Easy",
  Medium = "Medium",
  Hard = "Hard",
}

export enum InterviewStatus {
  PendingInfo = "PendingInfo",
  Ready = "Ready",
  InProgress = "InProgress",
  Completed = "Completed",
}

export interface Message {
  sender: 'ai' | 'user' | 'system';
  text: string;
  timestamp: number;
}

export interface Answer {
  question: string;
  answer: string;
  difficulty: Difficulty;
  score?: number;
  feedback?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: InterviewStatus;
  resumeFileName?: string;
  resumeText?: string;
  chatHistory: Message[];
  answers: Answer[];
  currentQuestionIndex: number;
  finalScore?: number;
  finalSummary?: string;
  createdAt: number;
}

export type Tab = 'interviewee' | 'interviewer';