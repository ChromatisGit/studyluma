"use client";

import { useState } from "react";
import { Key } from "lucide-react";

import { Modal } from "@components/Modal";
import { Button } from "@components/Button";
import { IconBox } from "@components/IconBox";
import styles from "./AccessCodeModal.module.css";

type AccessCodeModalProps = {
  accessCode: string;
  isOpen: boolean;
  onConfirm: () => void;
};

export function AccessCodeModal({ accessCode, isOpen, onConfirm }: AccessCodeModalProps) {
  const [hasSaved, setHasSaved] = useState(false);

  return (
    <Modal isOpen={isOpen}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <IconBox icon={Key} color="purple" size="lg" />
        </div>
        <h2 className={styles.title}>Save Your Access Code</h2>
        <p className={styles.description}>
          You will need this code along with your PIN to log in again.
        </p>
      </div>

      <div className={styles.codeBox}>
        <div className={styles.codeLabel}>Your Access Code</div>
        <span className={styles.code}>{accessCode}</span>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={hasSaved}
          onChange={(e) => setHasSaved(e.target.checked)}
        />
        <span className={styles.checkboxLabel}>I have saved my access code</span>
      </label>

      <Button variant="primary" fullWidth disabled={!hasSaved} onClick={onConfirm}>
        Continue
      </Button>
    </Modal>
  );
}
