import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertAdminAccess } from "@core/auth/guards";
import { getCourseDTO, getCoursesByAccess } from "@services/courseService";
import { getUserCount } from "@services/userService";
import { AdminDashboard } from "@features/admin/AdminDashboard";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  assertAdminAccess(session);
  const courseAccess = await getCoursesByAccess(session.user);
  const allCourseIds = [
    ...courseAccess.accessible,
    ...courseAccess.public,
    ...courseAccess.restricted,
    ...courseAccess.hidden,
  ];
  const [courses, totalUsers] = await Promise.all([
    Promise.all(allCourseIds.map((id) => getCourseDTO(id))),
    getUserCount(),
  ]);
  return { courses, totalUsers };
}

export default function Admin() {
  const { courses, totalUsers } = useLoaderData<typeof loader>();
  return <AdminDashboard courses={courses} totalUsers={totalUsers} />;
}
