import { Mail } from "lucide-react";
import HOMEPAGE_TEXT from "@features/homepage/homepage.de.json";
import { Container } from "@components/Container";
import styles from "@features/homepage/sections/Footer/Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { footer } = HOMEPAGE_TEXT;
  const copyrightText = footer.copyright.replace("{year}", String(currentYear));

  return (
    <footer className={styles.footer}>
      <Container size="wide" className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div>
            <h3 className={styles.footerTitle}>StudyNode</h3>
            <p className={styles.footerText}>{footer.description}</p>
          </div>

          <div>
            <h3 className={styles.footerTitle}>{footer.contactHeading}</h3>
            <a href="mailto:christian.contactmail@gmail.com" className={styles.footerLink} aria-label="Send email to christian.contactmail@gmail.com">
              <Mail size={18} aria-hidden />
              <span>christian.contactmail@gmail.com</span>
            </a>
            <p className={`${styles.footerText} ${styles.footerPrompt}`}>
              {footer.contactPrompt}
            </p>
          </div>
        </div>

        <div className={styles.footerBar}>
          <span>{footer.tagline}</span>
          <span>{copyrightText}</span>
        </div>
      </Container>
    </footer>
  );
}
