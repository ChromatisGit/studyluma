import { getSession } from "@services/authService";
import { getActiveQuizForUser } from "@services/quizService";
import { QuizPage } from "@features/quiz/QuizPage";

export const dynamic = "force-dynamic";

export default async function QuizRoute() {
  const session = await getSession();
  const user = session?.user ?? null;
  const initialState = user ? await getActiveQuizForUser(user) : null;

  return <QuizPage initialState={initialState} />;
}
