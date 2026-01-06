import { About } from "@/features/homepage/sections/About/About";
import { NodeNetwork } from "@/features/homepage/sections/Background/NodeNetwork";
import { CourseSection } from "@/features/homepage/sections/CourseSection/CourseSection";
import { Footer } from "@/features/homepage/sections/Footer/Footer";
import { Hero } from "@/features/homepage/sections/Hero/Hero";
import styles from "@features/homepage/Homepage.module.css";

export default function HomePage() {
  return (
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
  );
}
