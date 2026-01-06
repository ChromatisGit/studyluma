"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Highlight } from "prism-react-renderer";

import { transparentCodeTheme } from "@components/CodeBlock/codeTheme";
import styles from "./CodeEditor.module.css";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, rows = 10, readOnly = false }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const adjustHeight = () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
      setScrollLeft(textareaRef.current.scrollLeft);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    adjustHeight();
    onChange(e.target.value);
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className={styles.codeEditor}>
      {/* Highlighted code backdrop */}
      <div
        className={styles.codeEditorBackdrop}
        style={{
          transform: `translate(-${scrollLeft}px, -${scrollTop}px)`,
        }}
      >
        <Highlight theme={transparentCodeTheme} code={value} language="tsx">
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className={styles.highlightedCode}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>

      {/* Transparent textarea overlay */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onFocus={() => {
          if (readOnly && textareaRef.current) {
            textareaRef.current.blur();
          }
        }}
        className={clsx(styles.codeEditorTextarea, readOnly && styles.codeEditorTextareaReadOnly)}
        rows={rows}
        spellCheck={false}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        style={{
          caretColor: "white",
          minHeight: `${rows * 1.5}em`,
        }}
      />
    </div>
  );
}
