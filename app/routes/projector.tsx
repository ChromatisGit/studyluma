import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  getLesson,
  lessonText,
  ProjectorView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/viewer";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "" } = params;
  const lesson = getLesson(chapterId);
  if (!lesson || readViewer(request) !== "teacher") {
    throw new Response(null, { status: 404 });
  }
  return { lesson };
}

export function meta() {
  return [{ title: lessonText.projector.title }];
}

export default function ProjectorRoute() {
  const { lesson } = useLoaderData<typeof loader>();
  return <ProjectorView lesson={lesson} />;
}
