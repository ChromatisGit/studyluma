"use client";

import clsx from "clsx";
import { useState } from "react";
import type { InputTaskMacro, InputAnswer } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroValue } from "@macros/state/useMacroValue";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import { Stack } from "@components/Stack";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<InputTaskMacro>;

type CheckState = "none" | "correct" | "wrong";

// Initial empty values per answer kind
function emptyValues(answer: InputAnswer): number[] {
  switch (answer.kind) {
    case "number": return [NaN];
    case "vector": return answer.values.map(() => NaN);
    case "fraction": return [NaN, NaN];
    case "power": return [NaN, NaN];
  }
}

function fieldCount(answer: InputAnswer): number {
  switch (answer.kind) {
    case "number": return 1;
    case "vector": return answer.values.length;
    case "fraction": return 2;
    case "power": return 2;
  }
}

function isCorrect(answer: InputAnswer, values: number[], tolerance: number | undefined): boolean {
  const tol = tolerance ?? 0;
  switch (answer.kind) {
    case "number":
      return Math.abs((values[0] ?? NaN) - answer.value) <= tol;
    case "vector":
      return answer.values.every((v, i) => Math.abs((values[i] ?? NaN) - v) <= tol);
    case "fraction":
      return (values[0] ?? NaN) === answer.numerator && (values[1] ?? NaN) === answer.denominator;
    case "power":
      return (values[0] ?? NaN) === answer.base && (values[1] ?? NaN) === answer.exponent;
  }
}

export default function InputTaskRenderer({ macro, context }: Props) {
  const [values, setValues] = useMacroValue<number[]>(
    context.storageKey,
    emptyValues(macro.answer)
  );
  const [checkState, setCheckState] = useState<CheckState>("none");

  const count = fieldCount(macro.answer);
  const isAttempted = values.slice(0, count).every((v) => !isNaN(v));

  useMacroCheck(context, isAttempted, () => {
    setCheckState(isCorrect(macro.answer, values, macro.tolerance) ? "correct" : "wrong");
  });

  const handleChange = (index: number, raw: string) => {
    const num = raw === "" ? NaN : parseFloat(raw);
    setValues((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
    setCheckState("none");
  };

  const handleCheck = () => {
    setCheckState(isCorrect(macro.answer, values, macro.tolerance) ? "correct" : "wrong");
  };

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const why = getMarkdown(macro.why);

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}

      <div className={styles.inputTask}>
        <InputFields
          answer={macro.answer}
          values={values}
          checkState={checkState}
          onChange={handleChange}
        />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.checkButton}
            onClick={handleCheck}
            disabled={!isAttempted || checkState === "correct"}
          >
            {MACROS_TEXT.inputTask.checkButton}
          </button>
          {checkState === "correct" && (
            <span className={styles.resultCorrect}>{MACROS_TEXT.inputTask.correct}</span>
          )}
          {checkState === "wrong" && (
            <span className={styles.resultWrong}>{MACROS_TEXT.inputTask.wrong}</span>
          )}
        </div>
      </div>

      {(hint || (checkState !== "none" && why)) && (
        <Stack gap="sm">
          {hint && (
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          )}
          {checkState !== "none" && why && (
            <CollapsibleSection
              type="why"
              defaultOpen
              content={<MarkdownRenderer markdown={why} />}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}

interface InputFieldsProps {
  answer: InputAnswer;
  values: number[];
  checkState: CheckState;
  onChange: (index: number, raw: string) => void;
}

function InputFields({ answer, values, checkState, onChange }: InputFieldsProps) {
  switch (answer.kind) {
    case "number":
      return (
        <div className={styles.fields}>
          <Field index={0} values={values} checkState={checkState} onChange={onChange} />
        </div>
      );

    case "vector":
      return (
        <div className={styles.fields}>
          <span className={styles.vectorParens}>(</span>
          {answer.values.map((_, i) => (
            <Field key={i} index={i} values={values} checkState={checkState} onChange={onChange} />
          ))}
          <span className={styles.vectorParens}>)</span>
        </div>
      );

    case "fraction":
      return (
        <div className={styles.fields}>
          <div className={styles.fraction}>
            <Field index={0} values={values} checkState={checkState} onChange={onChange} />
            <div className={styles.fractionLine} />
            <Field index={1} values={values} checkState={checkState} onChange={onChange} />
          </div>
        </div>
      );

    case "power":
      return (
        <div className={styles.fields}>
          <div className={styles.power}>
            <Field index={0} values={values} checkState={checkState} onChange={onChange} />
            <div className={styles.exponentField}>
              <Field index={1} values={values} checkState={checkState} onChange={onChange} small />
            </div>
          </div>
        </div>
      );
  }
}

interface FieldProps {
  index: number;
  values: number[];
  checkState: CheckState;
  onChange: (index: number, raw: string) => void;
  small?: boolean;
}

function Field({ index, values, checkState, onChange, small }: FieldProps) {
  const value = values[index];
  const displayValue = value === undefined || isNaN(value) ? "" : String(value);

  return (
    <div className={styles.field}>
      <input
        type="number"
        value={displayValue}
        onChange={(e) => onChange(index, e.target.value)}
        className={clsx(
          styles.fieldInput,
          small && styles["fieldInput--sm"],
          checkState === "correct" && styles["fieldInput--correct"],
          checkState === "wrong" && styles["fieldInput--wrong"],
        )}
        disabled={checkState === "correct"}
      />
    </div>
  );
}
