"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./Modal.module.css";

export type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
};

export function Modal({ children, isOpen }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.modal}
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
