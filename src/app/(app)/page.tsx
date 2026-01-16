import { Layout } from "@components/Layout/Layout";
import { getSession } from "@/server/auth/auth";
import { getSidebarDTO } from "@/server/data/getSidebarDTO";
import { isAdmin } from "@/domain/userTypes";
import { signOutAction } from "@/server/auth/accessAction";

import { About } from "@/features/homepage/sections/About/About";
import { NodeNetwork } from "@/features/homepage/sections/Background/NodeNetwork";
import { CourseSection } from "@/features/homepage/sections/CourseSection/CourseSection";
import { Footer } from "@/features/homepage/sections/Footer/Footer";
import { Hero } from "@/features/homepage/sections/Hero/Hero";
import styles from "@features/homepage/Homepage.module.css";

async function logoutAction() {
  "use server";
  await signOutAction();
}

export default async function HomePage() {
  const session = await getSession();
  const user = session?.user ?? null;
  const isUserAdmin = user ? isAdmin(user) : false;
  const sidebarData = await getSidebarDTO({ courseId: null, user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isUserAdmin}
      activeCourseLabel={null}
      logoutAction={logoutAction}
      fullWidth
    >
      <main className={styles.page}>
        <div className={styles.networkLayer}>
          <NodeNetwork />
          <div className={styles.networkFade} />
        </div>

        <Hero />
        <CourseSection />
        <About />
        <Footer />
      </main>
    </Layout>
  );
}
