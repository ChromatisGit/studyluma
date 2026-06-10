"use client";

import { useState } from "react";
import { Key } from "lucide-react";

import { Modal } from "@components/Modal";
import { Button } from "@components/Button";
import { IconBox } from "@components/IconBox";
import styles from "./UsernameModal.module.css";
import ACCESS_TEXT from "./access.de.json";

type UsernameModalProps = {
  username: string;
  isOpen: boolean;
  onConfirm: () => void;
};

export function UsernameModal({ username, isOpen, onConfirm }: UsernameModalProps) {
  const [hasSaved, setHasSaved] = useState(false);

  return (
    <Modal isOpen={isOpen}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <IconBox icon={Key} color="purple" size="lg" />
        </div>
        <h2 className={styles.title}>{ACCESS_TEXT.modal.title}</h2>
        <p className={styles.description}>
          {ACCESS_TEXT.modal.description}
        </p>
      </div>

      <div className={styles.usernameBox}>
        <div className={styles.usernameLabel}>{ACCESS_TEXT.modal.usernameLabel}</div>
        <span className={styles.username}>{username}</span>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={hasSaved}
          onChange={(e) => setHasSaved(e.target.checked)}
        />
        <span className={styles.checkboxLabel}>{ACCESS_TEXT.modal.checkboxLabel}</span>
      </label>

      <Button variant="primary" fullWidth disabled={!hasSaved} onClick={onConfirm}>
        {ACCESS_TEXT.modal.continueButton}
      </Button>
    </Modal>
  );
}
