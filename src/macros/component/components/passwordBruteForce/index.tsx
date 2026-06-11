"use client";

import { useState } from "react";
import { estimateBruteForceTime, formatBigInt, formatDuration } from "./logic";
import styles from "./styles.module.css";

type CharsetTagProps = {
  label: string;
  active: boolean;
  accentVar: string;
  softBgVar: string;
  softBorderVar: string;
};

function CharsetTag({ label, active, accentVar, softBgVar, softBorderVar }: CharsetTagProps) {
  return (
    <span
      className={`${styles.tag} ${active ? styles.active : ""}`}
      style={active ? {
        ["--tag-accent" as string]: `var(${accentVar})`,
        ["--tag-soft-bg" as string]: `var(${softBgVar})`,
        ["--tag-soft-border" as string]: `var(${softBorderVar})`,
      } : undefined}
    >
      <span className={styles.tagDot} />
      {label}
    </span>
  );
}

export default function PasswordBruteForce() {
  const [password, setPassword] = useState("");

  const estimate = estimateBruteForceTime(password);
  const hasInput = password.length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <label className={styles.label}>
          Passwort testen (keine echten Passwörter eingeben)
        </label>
        <input
          id="bf-password-input"
          className={styles.input}
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="z. B. 123456"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.charsets}>
        <CharsetTag
          label="Zahlen (10)"
          active={estimate.usedCharsets.digits}
          accentVar="--info"
          softBgVar="--info-light"
          softBorderVar="--info-border"
        />
        <CharsetTag
          label="Kleinbuchstaben (26)"
          active={estimate.usedCharsets.lowercase}
          accentVar="--support"
          softBgVar="--support-light"
          softBorderVar="--support-border"
        />
        <CharsetTag
          label="Großbuchstaben (26)"
          active={estimate.usedCharsets.uppercase}
          accentVar="--warning"
          softBgVar="--warning-light"
          softBorderVar="--warning-border"
        />
        <CharsetTag
          label="Sonderzeichen (32)"
          active={estimate.usedCharsets.symbols}
          accentVar="--primary"
          softBgVar="--primary-light"
          softBorderVar="--primary-border"
        />
      </div>

      <hr className={styles.divider} />

      {hasInput ? (
        <>
          <div className={styles.results}>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Länge</span>
              <span className={styles.resultValue}>{estimate.passwordLength} Zeichen</span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Zeichensatzgröße</span>
              <span className={styles.resultValue}>{estimate.charsetSize}</span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Kombinationen</span>
              <span className={styles.resultValue}>{formatBigInt(estimate.combinations)}</span>
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Geschätzte Brute-Force-Dauer (Ø)</span>
              <span className={`${styles.resultValue} ${styles.highlight}`}>
                {formatDuration(estimate.averageSeconds)}
              </span>
            </div>
          </div>
          <p className={styles.assumption}>
            Modellannahme: reiner Offline-Brute-Force-Angriff mit 10^9 Versuchen/s; im Durchschnitt
            liegt der Treffer nach etwa der Hälfte aller Kombinationen.
          </p>
        </>
      ) : (
        <p className={styles.empty}>Passwort eingeben um die Schätzung zu sehen</p>
      )}
    </div>
  );
}
