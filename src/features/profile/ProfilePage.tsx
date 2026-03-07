"use client";

import { useTransition } from "react";
import { LogOut, Moon, Sun, Zap } from "lucide-react";
import { Button } from "@components/Button";
import { useTheme } from "@ui/contexts/ThemeContext";
import styles from "./ProfilePage.module.css";

type ProfilePageProps = {
  accessCode?: string;
  badge?: string;
  xp?: number;
  coursesCount: number;
  signOutAction: () => Promise<void>;
};

export function ProfilePage({
  accessCode,
  badge,
  xp,
  coursesCount,
  signOutAction,
}: ProfilePageProps) {
  const { theme, toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Profile</h1>

        {/* Identity card */}
        <div className={styles.identityCard}>
          {badge && <div className={styles.badgeEmoji} aria-hidden>{badge}</div>}
          <h2 className={styles.username}>{accessCode ?? "Student"}</h2>
          {xp !== undefined && (
            <div className={styles.xpBadge}>
              <Zap size={14} aria-hidden />
              {xp} XP
            </div>
          )}
        </div>

        {/* Settings */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Settings</h2>
          <div className={styles.settingsCard}>
            <div className={styles.settingRow}>
              <div className={styles.settingLabel}>
                {theme === "dark"
                  ? <Moon size={18} aria-hidden />
                  : <Sun size={18} aria-hidden />}
                <span>Theme</span>
              </div>
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? "Light" : "Dark"}
              </Button>
            </div>

            <div className={styles.separator} role="separator" />

            <button
              type="button"
              className={styles.signOutButton}
              onClick={handleSignOut}
              disabled={isPending}
            >
              <LogOut size={16} aria-hidden />
              {isPending ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Stats</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{xp ?? 0}</div>
              <div className={styles.statLabel}>Total XP</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{coursesCount}</div>
              <div className={styles.statLabel}>Courses</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
