import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import {
  getLesson,
  lessonText,
  ProjectorView,
} from "../../src/modules/lessons";

export function loader({ params }: LoaderFunctionArgs) {
  const { chapterId = "" } = params;
  const lesson = getLesson(chapterId);
  if (!lesson) {
    throw new Response(null, { status: 404 });
  }
  return { lesson };
}

export function meta() {
  return [{ title: lessonText.projector.title }];
}

export default function ProjectorRoute() {
  const { lesson } = useLoaderData<typeof loader>();
  const { courseId = "" } = useParams();
  return <ProjectorView courseId={courseId} lesson={lesson} />;
}
