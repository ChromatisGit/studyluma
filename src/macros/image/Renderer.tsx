import Image from "next/image";
import clsx from "clsx";
import type { ImageMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import styles from "./styles.module.css";

type Props = MacroComponentProps<ImageMacro>;

const SIZE_MAP = {
  S: "small",
  M: "medium",
  L: "large",
} as const;

export default function ImageRenderer({ macro }: Props) {
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
