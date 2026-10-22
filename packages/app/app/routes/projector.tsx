import { useLoaderData, useParams } from "react-router";
import { lessonText, ProjectorView } from "../../src/modules/lessons";
import { chapterPath } from "../../src/modules/courses";
import type { loader } from "./projector.server";

export function meta() {
  return [{ title: lessonText.projector.title }];
}

export default function ProjectorRoute() {
  const { deck } = useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  return (
    <ProjectorView
      deck={deck}
      chapterPath={chapterPath(courseId, chapterSlug)}
    />
  );
}
