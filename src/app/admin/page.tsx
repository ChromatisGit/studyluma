import { getSession, getAllUsersForStats } from "@/server/auth/auth";
import { getCoursesByAccess } from "@/server/data/courses";
import { getCourseDTO } from "@/server/data/getCourseDTO";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export default async function AdminDashboardPage() {
  const session = await getSession();
  // Layout already checks for admin auth, so we know session!.user exists and is admin
  const user = session!.user;

  const courseAccess = getCoursesByAccess(user);
  const allCourseIds = [
    ...courseAccess.accessible,
    ...courseAccess.restricted,
    ...courseAccess.hidden,
  ];

  const courses = allCourseIds.map((id) => getCourseDTO(id));

  // Count total users (excluding admins)
  const allUsers = await getAllUsersForStats();
  const totalUsers = allUsers.filter((u) => u.role === "user").length;

  return (
    <AdminDashboard
      courses={courses}
      totalUsers={totalUsers}
      accessibleCoursesCount={courseAccess.accessible.length}
    />
  );
}
