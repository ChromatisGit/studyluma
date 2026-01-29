import { notFound } from "next/navigation";
import { getSession } from "@services/authService";
import { isAdmin } from "@schema/userTypes";
import { getCoursesByAccess } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { AdminDashboard } from "@features/admin/AdminDashboard";
import { getUserCount } from "@services/userService";

export default async function AdminDashboardPage() {
  const session = await getSession();

  // Explicit check even though layout also checks - defense in depth
  if (!session || !isAdmin(session.user)) {
    notFound();
  }

  const user = session.user;

  const courseAccess = getCoursesByAccess(user);
  const allCourseIds = [
    ...courseAccess.accessible,
    ...courseAccess.public,
    ...courseAccess.restricted,
    ...courseAccess.hidden,
  ];

  const courses = allCourseIds.map((id) => getCourseDTO(id));

  // Count total users
  const totalUsers = await getUserCount();

  return (
    <AdminDashboard
      courses={courses}
      totalUsers={totalUsers}
    />
  );
}

