import type { TaskSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import { FocusBox } from "./FocusBox";
import { BulletList } from "./BulletList";
import { ResultBox } from "./ResultBox";
import { MaterialRenderer } from "./MaterialRenderer";
import styles from "./slide.module.css";

const ACCENT = "var(--sn-teal-accent)";

type Props = { slide: TaskSlide; revealStep: number; projector?: boolean };

export function TaskSlideView({ slide, revealStep, projector }: Props) {
  const bullets = slide.bullets ?? [];
  const hasResult = slide.result != null;
  const isManual = slide.reveal === "manual";
  const hasMaterial = !!slide.material;

  const body = (
    <div className={styles.splitBody}>
      {bullets.length > 0 && (
        <BulletList
          bullets={bullets}
          accent={ACCENT}
          revealedCount={isManual ? revealStep : Infinity}
        />
      )}
      {slide.inlineMaterial && (
        <MaterialRenderer item={slide.inlineMaterial} projector={projector} />
      )}
    </div>
  );

  return (
    <>
      <SlideHeader title={slide.header} badge="Auftrag" accent="teal" />
      <div className={styles.slideContent}>
        {slide.focus && <FocusBox text={slide.focus} accent={ACCENT} task />}
        {hasMaterial ? (
          <div className={styles.split}>
            {body}
            <div className={styles.splitMaterial}>
              <MaterialRenderer item={slide.material!} projector={projector} />
            </div>
          </div>
        ) : body}
        {hasResult && (
          <ResultBox result={slide.result!} visible={true} accent={ACCENT} />
        )}
      </div>
    </>
  );
}
