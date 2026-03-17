import type { HookSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import { FocusBox } from "./FocusBox";
import { BulletList } from "./BulletList";
import { MaterialRenderer } from "./MaterialRenderer";
import styles from "./slide.module.css";

const ACCENT = "var(--sn-orange-accent)";

type Props = { slide: HookSlide; revealStep: number; projector?: boolean };

export function HookSlideView({ slide, revealStep, projector }: Props) {
  const hasMaterial = !!slide.material;
  const bullets = slide.bullets ?? [];
  const isManual = slide.reveal === "manual";

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
      <SlideHeader title={slide.header} badge="Einstieg" accent="orange" />
      <div className={styles.slideContent}>
        {hasMaterial ? (
          <div className={styles.split}>
            {body}
            <div className={styles.splitMaterial}>
              <MaterialRenderer item={slide.material!} projector={projector} />
            </div>
          </div>
        ) : body}
      </div>
    </>
  );
}
