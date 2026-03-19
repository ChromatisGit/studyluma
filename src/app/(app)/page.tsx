import { redirect } from "next/navigation";
import { Layout } from "@ui/layout/Layout";
import { getSession, isAdmin } from "@services/authService";
import { getSidebarDTO, getPublicNavbarCourses } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";

import { About } from "@features/homepage/sections/About/About";
import { NodeNetwork } from "@features/homepage/sections/Background/NodeNetwork";
import { CourseSection } from "@features/homepage/sections/CourseSection/CourseSection";
import { Footer } from "@features/homepage/sections/Footer/Footer";
import { Hero } from "@features/homepage/sections/Hero/Hero";
import styles from "@features/homepage/Homepage.module.css";

export const dynamic = "force-dynamic";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>;
}) {
  const session = await getSession();
  const user = session?.user ?? null;

  const [sidebarData, publicCourses] = await Promise.all([
    getSidebarDTO({ courseId: null, user }),
    getPublicNavbarCourses(),
  ]);

  const params = await searchParams;
  if (user && !params.home && sidebarData.courses.length > 0) {
    redirect(sidebarData.courses[0].href);
  }

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={user ? isAdmin(user) : false}
      signOutAction={signOutAction}
      fullWidth
    >
      <main className={styles.page}>
        <div className={styles.networkLayer}>
          <NodeNetwork />
          <div className={styles.networkFade} />
        </div>

        <Hero />
        <About />
        <CourseSection courses={publicCourses} />
        <Footer />
      </main>
    </Layout>
  );
}
