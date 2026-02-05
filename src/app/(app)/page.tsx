import { Layout } from "@ui/layout/Layout";
import { getSession } from "@services/authService";
import { getSidebarDTO } from "@services/getSidebarDTO";
import { getCoursesByAccess } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { isAdmin } from "@schema/userTypes";
import { signOutAction } from "@actions/accessActions";

import { About } from "@features/homepage/sections/About/About";
import { NodeNetwork } from "@features/homepage/sections/Background/NodeNetwork";
import { CourseSection, type CourseGroups } from "@features/homepage/sections/CourseSection/CourseSection";
import { Footer } from "@features/homepage/sections/Footer/Footer";
import { Hero } from "@features/homepage/sections/Hero/Hero";
import styles from "@features/homepage/Homepage.module.css";

export default async function HomePage() {
  const session = await getSession();
  const user = session?.user ?? null;
  const isUserAdmin = user ? isAdmin(user) : false;
  const sidebarData = await getSidebarDTO({ courseId: null, user });

  // Fetch course data in app layer, pass to feature
  const accessGroups = getCoursesByAccess(user);
  const courseGroups: CourseGroups = {
    public: accessGroups.public.map((courseId) => getCourseDTO(courseId)),
    accessible: accessGroups.accessible.map((courseId) => getCourseDTO(courseId)),
    restricted: accessGroups.restricted.map((courseId) => getCourseDTO(courseId)),
    hidden: accessGroups.hidden.map((courseId) => getCourseDTO(courseId)),
  };

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isUserAdmin}
      activeCourseLabel={null}
      signOutAction={signOutAction}
      fullWidth
    >
      <main className={styles.page}>
        <div className={styles.networkLayer}>
          <NodeNetwork />
          <div className={styles.networkFade} />
        </div>

        <Hero />
        <CourseSection groups={courseGroups} isAdmin={isUserAdmin} />
        <About />
        <Footer />
      </main>
    </Layout>
  );
}
