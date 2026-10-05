import {
  advanceRun,
  answerRun,
  joinRun,
  leaveRun,
  startRun,
  type QuizQuestion,
  type QuizRun,
  type QuizStep,
} from "../domain/quiz";
import {
  studentView,
  teacherView,
  type StudentQuizView,
  type TeacherQuizView,
} from "../domain/views";

/**
 * The running quizzes, in the memory of this server process. A stand-in
 * until there is a database: one process, lost on restart. Kept on
 * globalThis so a dev-server reload doesn't drop a running quiz.
 */
type Subscriber =
  | {
      role: "teacher";
      scope: string;
      send: (view: TeacherQuizView | null) => void;
    }
  | {
      role: "student";
      participant: string;
      scopes: string[];
      send: (views: StudentQuizView[]) => void;
    };

type Store = {
  runs: Map<string, QuizRun>;
  /** scope → participant → open connections */
  presence: Map<string, Map<string, number>>;
  subscribers: Set<Subscriber>;
};

/** A reload reconnects within this time without leaving the question. */
const LEAVE_GRACE_MS = 4000;

const store: Store = ((
  globalThis as { __studylumaQuiz?: Store }
).__studylumaQuiz ??= {
  runs: new Map(),
  presence: new Map(),
  subscribers: new Set(),
});

function present(scope: string): string[] {
  return [...(store.presence.get(scope) ?? new Map<string, number>())]
    .filter(([, connections]) => connections > 0)
    .map(([participant]) => participant);
}

function viewsFor(participant: string, scopes: string[]): StudentQuizView[] {
  return scopes.flatMap((scope) => {
    const run = store.runs.get(scope);
    const view = run && studentView(run, participant);
    return view ? [view] : [];
  });
}

function publish(scope: string) {
  const run = store.runs.get(scope);
  for (const subscriber of store.subscribers) {
    if (subscriber.role === "teacher" && subscriber.scope === scope) {
      subscriber.send(run ? teacherView(run) : null);
    } else if (
      subscriber.role === "student" &&
      subscriber.scopes.includes(scope)
    ) {
      subscriber.send(viewsFor(subscriber.participant, subscriber.scopes));
    }
  }
}

function update(scope: string, change: (run: QuizRun) => QuizRun) {
  const run = store.runs.get(scope);
  if (!run) {
    return;
  }
  const next = change(run);
  if (next !== run) {
    store.runs.set(scope, next);
    publish(scope);
  }
}

function countPresence(scope: string, participant: string, by: 1 | -1) {
  const map = store.presence.get(scope) ?? new Map<string, number>();
  store.presence.set(scope, map);
  const connections = Math.max(0, (map.get(participant) ?? 0) + by);
  if (connections === 0) {
    map.delete(participant);
  } else {
    map.set(participant, connections);
  }
  return connections;
}

/** A teacher window (lesson view or projector) follows one scope. */
export function watchAsTeacher(
  scope: string,
  send: (view: TeacherQuizView | null) => void,
): () => void {
  const subscriber: Subscriber = { role: "teacher", scope, send };
  store.subscribers.add(subscriber);
  const run = store.runs.get(scope);
  send(run ? teacherView(run) : null);
  return () => store.subscribers.delete(subscriber);
}

/**
 * A student device follows the quizzes of all courses the student belongs
 * to. Being connected is what counts as "logged in" for taking part.
 */
export function watchAsStudent(
  participant: string,
  scopes: string[],
  send: (views: StudentQuizView[]) => void,
): () => void {
  const subscriber: Subscriber = { role: "student", participant, scopes, send };
  store.subscribers.add(subscriber);
  for (const scope of scopes) {
    countPresence(scope, participant, 1);
    update(scope, (run) => joinRun(run, participant));
  }
  send(viewsFor(participant, scopes));
  return () => {
    store.subscribers.delete(subscriber);
    for (const scope of scopes) {
      if (countPresence(scope, participant, -1) > 0) {
        continue;
      }
      setTimeout(() => {
        if (!present(scope).includes(participant)) {
          update(scope, (run) => leaveRun(run, participant));
        }
      }, LEAVE_GRACE_MS);
    }
  };
}

export function startQuiz(input: {
  scope: string;
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  questions: QuizQuestion[];
}) {
  store.runs.set(
    input.scope,
    startRun({
      ...input,
      id: crypto.randomUUID(),
      present: present(input.scope),
    }),
  );
  publish(input.scope);
}

export function advanceQuiz(
  scope: string,
  runId: string,
  from: { index: number; step: QuizStep },
) {
  update(scope, (run) =>
    run.id === runId ? advanceRun(run, from, present(scope)) : run,
  );
}

export function endQuiz(scope: string, runId: string) {
  update(scope, (run) =>
    run.id === runId && !run.ended ? { ...run, ended: true } : run,
  );
}

export function answerQuiz(
  scope: string,
  participant: string,
  answer: { runId: string; index: number; optionIds: string[] },
) {
  update(scope, (run) =>
    run.id === answer.runId
      ? answerRun(run, participant, answer.index, answer.optionIds)
      : run,
  );
}
