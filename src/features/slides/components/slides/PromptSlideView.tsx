import type { PromptSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import { FocusBox } from "./FocusBox";
import { BulletList } from "./BulletList";
import { ResultBox } from "./ResultBox";
import { MaterialRenderer } from "./MaterialRenderer";
import styles from "./slide.module.css";

const ACCENT = "var(--info)";

type Props = { slide: PromptSlide; revealStep: number; projector?: boolean };

export function PromptSlideView({ slide, revealStep, projector }: Props) {
  const bullets = slide.bullets ?? [];
  const result = slide.result;
  const isManual = slide.reveal === "manual";
  const resultVisible = result != null && revealStep >= (isManual ? bullets.length + 1 : 1);
  const material = slide.material;

  const body = (
    <div className={styles.splitBody}>
      {slide.focus && <FocusBox text={slide.focus} accent={ACCENT} />}
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
      <SlideHeader title={slide.header} badge="Frage" accent="blue" />
      <div className={styles.slideContent}>
        {material ? (
          <div className={styles.split}>
            {body}
            <div className={styles.splitMaterial}>
              <MaterialRenderer item={material} projector={projector} />
            </div>
          </div>
        ) : body}
        {result != null && (
          <ResultBox result={result} visible={resultVisible} />
        )}
      </div>
    </>
  );
}
