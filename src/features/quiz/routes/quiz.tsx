import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertLoggedIn } from "@core/auth/guards";
import { getActiveQuizForUser } from "@services/quizService";
import { QuizPage } from "@features/quiz/QuizPage";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  assertLoggedIn(session);
  const initialState = await getActiveQuizForUser(session.user);
  return { initialState };
}

export default function QuizRoute() {
  const { initialState } = useLoaderData<typeof loader>();
  return <QuizPage initialState={initialState} />;
}
