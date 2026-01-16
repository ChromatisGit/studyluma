"use client";

import clsx from "clsx";
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  hint?: string;
  helperText?: string;
  error?: string;
  className?: string;
};

export function Input({
  label,
  hint,
  helperText,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        <span>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </label>
      <input
        id={inputId}
        className={clsx(styles.input, error && styles.inputError)}
        {...props}
      />
      {helperText && !error ? <p className={styles.helper}>{helperText}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
