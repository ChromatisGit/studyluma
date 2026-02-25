import { assertAdminAccess, getSession } from "@services/authService";
import { getCoursesByAccess, getCourseDTO } from "@services/courseService";
import { AdminDashboard } from "@features/admin/AdminDashboard";
import { getUserCount } from "@services/userService";

export default async function AdminDashboardPage() {

  const session = await getSession();
  assertAdminAccess(session);
  const user = session.user;

  const courseAccess = await getCoursesByAccess(user);
  const allCourseIds = [
    ...courseAccess.accessible,
    ...courseAccess.public,
    ...courseAccess.restricted,
    ...courseAccess.hidden,
  ];

  const courses = await Promise.all(allCourseIds.map((id) => getCourseDTO(id)));

  // Count total users
  const totalUsers = await getUserCount();

  return (
    <AdminDashboard
      courses={courses}
      totalUsers={totalUsers}
    />
  );
}

