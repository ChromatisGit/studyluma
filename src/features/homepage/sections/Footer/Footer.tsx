import clsx from "clsx";
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
            <h3 className={styles.footerTitle}>StudyLuma</h3>
            <p className={styles.footerText}>{footer.description}</p>
            <a
              href="https://studyluma.org"
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(styles.footerLink, styles.footerSiteLink)}
              aria-label="StudyLuma-Projektseite öffnen"
            >
              {footer.studylumaLabel} ↗
            </a>
          </div>

          <div>
            <h3 className={styles.footerTitle}>{footer.contactHeading}</h3>
            <a href="mailto:christian.contactmail@gmail.com" className={styles.footerLink} aria-label="Send email to christian.contactmail@gmail.com">
              <Mail size={18} aria-hidden />
              <span>christian.contactmail@gmail.com</span>
            </a>
            <p className={clsx(styles.footerText, styles.footerPrompt)}>
              {footer.contactPrompt}
            </p>
          </div>
        </div>

        <div className={styles.footerBar}>
          <span>{footer.tagline}</span>
          <div className={styles.footerBarRight}>
            <a href="/impressum" className={styles.footerNavLink}>{footer.impressumLabel}</a>
            <span>{copyrightText}</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
