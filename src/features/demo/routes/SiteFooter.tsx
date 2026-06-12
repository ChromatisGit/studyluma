import TEXT from "./landingPage.de.json";
import styles from "./siteFooter.module.css";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>{TEXT.footer.copyright.replace("{year}", String(year))}</span>
        <span>{TEXT.footer.tagline}</span>
        <a href="/impressum" className={styles.link}>{TEXT.footer.impressum}</a>
      </div>
    </footer>
  );
}
