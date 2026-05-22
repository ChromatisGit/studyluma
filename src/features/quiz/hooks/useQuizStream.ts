import type { StudentStreamEvent } from "@schema/streamTypes";

type QuizStreamOptions = {
  onEvent: (event: StudentStreamEvent) => void;
  enabled?: boolean;
};

export function useQuizStream(_options: QuizStreamOptions): void {
  // Realtime removed. Quiz state is read from DB via loader on each navigation.
}
