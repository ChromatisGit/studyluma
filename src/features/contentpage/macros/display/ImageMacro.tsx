/* eslint-disable @next/next/no-img-element */
import type { ImageMacro as ImageMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import styles from "./ImageMacro.module.css";

type Props = MacroComponentProps<ImageMacroType>;

const SIZE_MAP = {
  S: "small",
  M: "medium",
  L: "large",
} as const;

export function ImageMacro({ macro }: Props) {
  const sizeClass = styles[SIZE_MAP[macro.size]];

  return (
    <figure className={styles.figure}>
      <img
        src={macro.source}
        alt=""
        className={`${styles.image} ${sizeClass}`}
      />
    </figure>
  );
}
