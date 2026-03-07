import { redirect } from "next/navigation";

// Topic overview is deprecated — redirect to the course/courses page which contains the roadmap
type PageParams = {
  params: Promise<{
    group: string;
    course: string;
  }>;
};

export default async function TopicOverviewPage({ params }: PageParams) {
  const { group, course } = await params;
  redirect(`/${group}/${course}`);
}
