
import { Difficulty } from './types';

export const INTERVIEW_FLOW: { difficulty: Difficulty; duration: number }[] = [
  { difficulty: Difficulty.Easy, duration: 20 },
  { difficulty: Difficulty.Easy, duration: 20 },
  { difficulty: Difficulty.Medium, duration: 60 },
  { difficulty: Difficulty.Medium, duration: 60 },
  { difficulty: Difficulty.Hard, duration: 120 },
  { difficulty: Difficulty.Hard, duration: 120 },
];

export const TOTAL_QUESTIONS = INTERVIEW_FLOW.length;
