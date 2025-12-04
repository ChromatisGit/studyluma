import Layout from "@theme/Layout";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import layout from "@features/homepage/layout/HomepageLayout.module.css";
import { About } from "@features/homepage/sections/About/About";
import { CourseSection } from "@features/homepage/sections/CourseSection/CourseSection";
import { Footer } from "@features/homepage/sections/Footer/Footer";
import { Hero } from "@features/homepage/sections/Hero/Hero";
import { NodeNetwork } from "@features/homepage/sections/Background/NodeNetwork";

export default function Home() {
  const { meta } = HOMEPAGE_COPY;

  return (
    <Layout title={meta.title} description={meta.description}>
      <main className={layout.page}>
        <div className={layout.networkLayer} aria-hidden="true">
          <NodeNetwork />
          <div className={layout.networkFade} />
        </div>

        <div>
          <Hero />
          <CourseSection />
          <About />
          <Footer />
        </div>
      </main>
    </Layout>
  );
}
