import Image from "next/image";
import clsx from "clsx";
import type { ImageMacro as ImageMacroType } from "@schema/macroTypes";
import type { MacroComponentProps } from "@features/contentpage/macros/types";
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
      <Image
        src={macro.source}
        alt=""
        width={macro.width}
        height={macro.height}
        className={clsx(styles.image, sizeClass)}
      />
    </figure>
  );
}
