import "server-only";

export type PracticeTask = {
  id: string;
  title: string;
  prompt: string;
};

export function getPracticeTasks(courseId: string): PracticeTask[] {
  return [
    {
      id: `${courseId}-p1`,
      title: "Warm-up",
      prompt: "Summarize the key concept from today's topic in one sentence.",
    },
    {
      id: `${courseId}-p2`,
      title: "Apply",
      prompt: "Solve a small example using the topic's main technique.",
    },
  ];
}
