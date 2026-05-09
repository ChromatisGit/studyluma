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
        <label className={styles.label} htmlFor="bf-password-input">
          Passwort eingeben
        </label>
        <input
          id="bf-password-input"
          className={styles.input}
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="z. B. sommer2024!"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.charsets}>
        <CharsetTag
          label="Zahlen (10)"
          active={estimate.usedCharsets.digits}
          accentVar="--sn-blue-accent"
          softBgVar="--sn-blue-accent-soft-bg"
          softBorderVar="--sn-blue-accent-soft-border"
        />
        <CharsetTag
          label="Kleinbuchstaben (26)"
          active={estimate.usedCharsets.lowercase}
          accentVar="--sn-teal-accent"
          softBgVar="--sn-teal-accent-soft-bg"
          softBorderVar="--sn-teal-accent-soft-border"
        />
        <CharsetTag
          label="Großbuchstaben (26)"
          active={estimate.usedCharsets.uppercase}
          accentVar="--sn-orange-accent"
          softBgVar="--sn-orange-accent-soft-bg"
          softBorderVar="--sn-orange-accent-soft-border"
        />
        <CharsetTag
          label="Sonderzeichen (32)"
          active={estimate.usedCharsets.symbols}
          accentVar="--sn-purple-accent"
          softBgVar="--sn-purple-accent-soft-bg"
          softBorderVar="--sn-purple-accent-soft-border"
        />
      </div>

      <hr className={styles.divider} />

      {hasInput ? (
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
          <div className={`${styles.resultItem}`}>
            <span className={styles.resultLabel}>Geschätzte Knackzeit (Ø)</span>
            <span className={`${styles.resultValue} ${styles.highlight}`}>
              {formatDuration(estimate.averageSeconds)}
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>Passwort eingeben um die Schätzung zu sehen</p>
      )}
    </div>
  );
}
