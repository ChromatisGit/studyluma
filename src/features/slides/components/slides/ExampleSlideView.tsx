import type { ExampleSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import { BulletList } from "./BulletList";
import { ResultBox } from "./ResultBox";
import { MaterialRenderer } from "./MaterialRenderer";
import styles from "./slide.module.css";

const ACCENT = "var(--muted-foreground)";

type Props = { slide: ExampleSlide; revealStep: number; projector?: boolean };

export function ExampleSlideView({ slide, revealStep, projector }: Props) {
  const bullets = slide.bullets ?? [];
  const result = slide.result;
  const isManual = slide.reveal === "manual";
  const resultVisible = result != null && revealStep >= (isManual ? bullets.length + 1 : 1);
  const material = slide.material;

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
      <SlideHeader title={slide.header} badge="Beispiel" accent="muted" />
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
