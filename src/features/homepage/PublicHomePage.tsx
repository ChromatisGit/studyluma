import type { CourseDTO } from "@schema/courseTypes";
import { Hero } from "./sections/Hero/Hero";
import { CourseSection } from "./sections/CourseSection/CourseSection";
import { About } from "./sections/About/About";
import { Footer } from "./sections/Footer/Footer";
import { NodeNetwork } from "./sections/Background/NodeNetwork";

type PublicHomePageProps = {
  publicCourses: CourseDTO[];
};

export function PublicHomePage({ publicCourses }: PublicHomePageProps) {
  return (
    <>
      <NodeNetwork />
      <Hero />
      <CourseSection courses={publicCourses} />
      <About />
      <Footer />
    </>
  );
}
