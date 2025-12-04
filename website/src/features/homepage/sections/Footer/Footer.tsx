import { Mail } from "lucide-react";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import styles from "@features/homepage/sections/Footer/Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { footer } = HOMEPAGE_COPY;
  const copyrightText = footer.copyright.replace("{year}", String(currentYear));

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div>
            <h3 className={styles.footerTitle}>StudyNode</h3>
            <p className={styles.footerText}>{footer.description}</p>
          </div>

          <div>
            <h3 className={styles.footerTitle}>{footer.contactHeading}</h3>
            <a href="mailto:holst@studynode.com" className={styles.footerLink} aria-label="Send email to holst@studynode.com">
              <Mail size={18} aria-hidden />
              <span>holst@studynode.com</span>
            </a>
            <p className={styles.footerText} style={{ marginTop: '0.5rem' }}>
              {footer.contactPrompt}
            </p>
          </div>
        </div>

        <div className={styles.footerBar}>
          <span>{footer.tagline}</span>
          <span>{copyrightText}</span>
        </div>
      </div>
    </footer>
  );
}
