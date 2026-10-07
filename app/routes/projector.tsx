import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import {
  getLesson,
  lessonText,
  ProjectorView,
} from "../../src/modules/lessons";
import { flowFromParam, flowLesson } from "../../src/modules/teaching";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "" } = params;
  const flowId = new URL(request.url).searchParams.get("flow");
  const flow = flowFromParam(chapterId, flowId);
  const lesson = flow ? flowLesson(flow) : getLesson(chapterId);
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
