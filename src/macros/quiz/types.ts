import type { Markdown } from "@schema/page";

export type QuizMacro = {
  type: "quiz";
  question: Markdown;
  correct: Markdown[];
  options: Markdown[];
  single: boolean;
  /** Timer in seconds, or false = no timer */
  timer: number | false;
  /** Explanation shown during reveal phase on projector and student device */
  why?: Markdown;
};
