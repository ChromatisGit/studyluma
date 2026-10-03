import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getCourse, listCourses } from "../../src/modules/courses";
import { getLesson, quizQuestions } from "../../src/modules/lessons";
import {
  advanceQuiz,
  answerQuiz,
  endQuiz,
  parseQuizCommand,
  quizEventStream,
  quizScope,
  startQuiz,
  validQuestions,
  type QuizCommand,
} from "../../src/modules/quiz";
import {
  readParticipant,
  readRoom,
  readViewer,
} from "../../src/modules/viewer";

/**
 * Stub until there are accounts and memberships: every student belongs to
 * every course.
 */
function memberCourseIds(): string[] {
  return listCourses().map((course) => course.id);
}

/** The quiz event stream: teachers follow one course, students all theirs. */
export function loader({ request }: LoaderFunctionArgs) {
  const room = readRoom(request);
  if (readViewer(request) === "teacher") {
    const courseId = new URL(request.url).searchParams.get("course") ?? "";
    if (!getCourse(courseId)) {
      throw new Response(null, { status: 404 });
    }
    return quizEventStream(request, {
      role: "teacher",
      scope: quizScope(room, courseId),
    });
  }
  const participant = readParticipant(request);
  return quizEventStream(
    request,
    {
      role: "student",
      participant: participant.id,
      scopes: memberCourseIds().map((id) => quizScope(room, id)),
    },
    participant.setCookie ? { "Set-Cookie": participant.setCookie } : {},
  );
}

function startFromFrame(
  scope: string,
  command: Extract<QuizCommand, { intent: "start" }>,
) {
  const frame = getLesson(command.chapterId)?.frames.find(
    (item) => item.id === command.frameId,
  );
  const quiz = frame && quizQuestions(frame);
  if (!quiz || !validQuestions(quiz.questions)) {
    return false;
  }
  startQuiz({
    scope,
    courseId: command.courseId,
    chapterId: command.chapterId,
    frameId: command.frameId,
    ...quiz,
  });
  return true;
}

function teacherCommand(scope: string, command: QuizCommand): boolean {
  switch (command.intent) {
    case "start":
      return startFromFrame(scope, command);
    case "advance":
      advanceQuiz(scope, command.runId, command);
      return true;
    case "end":
      endQuiz(scope, command.runId);
      return true;
    default:
      return false;
  }
}

/** Commands: teachers start and move the quiz on, students answer. */
export async function action({ request }: ActionFunctionArgs) {
  const command = parseQuizCommand(await request.json().catch(() => null));
  if (!command || !getCourse(command.courseId)) {
    return new Response(null, { status: 400 });
  }
  const scope = quizScope(readRoom(request), command.courseId);
  const viewer = readViewer(request);
  if (viewer === "teacher") {
    return new Response(null, {
      status: teacherCommand(scope, command) ? 204 : 400,
    });
  }
  if (
    command.intent !== "answer" ||
    !memberCourseIds().includes(command.courseId)
  ) {
    return new Response(null, { status: 403 });
  }
  answerQuiz(scope, readParticipant(request).id, command);
  return new Response(null, { status: 204 });
}
