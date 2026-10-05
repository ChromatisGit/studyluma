import type { ReactNode } from "react";

/**
 * StudyLuma pictograms: one drawing standard so pictograms from different
 * authors read as one family. 28-unit grid, 1.6 stroke, no fills, and at most
 * one element marked as accent (`pictogram__accent`, `pictogram__fill`,
 * `pictogram__area`), which takes the line color.
 *
 * This built-in set is the seed of the planned shared gallery; course and
 * roadmap data refer to pictograms by id.
 */
const gallery: Record<string, ReactNode> = {
  terme: (
    <>
      <text
        x="14"
        y="18.5"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        x²
      </text>
      <path className="pictogram__accent" d="M5 23 H23" />
    </>
  ),
  polynom: (
    <>
      <path d="M3 23 C9 1 16 27 25 5" />
    </>
  ),
  mengen: (
    <>
      <path d="M3 17 H25" />
      <path d="M9 12 V22 M9 12 H11 M9 22 H11 M19 12 V22 M19 12 H17 M19 22 H17" />
      <path className="pictogram__accent" d="M9 17 H19" strokeWidth="3" />
    </>
  ),
  exp: (
    <>
      <path d="M3 24 H25" />
      <path d="M3 22 C14 22 19 19 24 4" />
    </>
  ),
  trafo: (
    <>
      <path d="M3 5 Q9 31 15 5" />
      <path
        className="pictogram__accent"
        d="M12 5 Q18 31 24 5"
        strokeDasharray="2.5 2.5"
      />
    </>
  ),
  diff: (
    <>
      <path d="M3 23 Q13 1 25 15" />
      <path className="pictogram__accent" d="M4 13.5 L24 7.5" />
      <circle className="pictogram__fill" cx="13" cy="10.8" r="1.8" />
    </>
  ),
  vektor: (
    <>
      <path d="M5 23 H23 M23 23 L19.5 20 M23 23 L19.5 26" />
      <path
        className="pictogram__accent"
        d="M5 23 L20 6 M20 6 L15 7.5 M20 6 L19 11"
      />
    </>
  ),
  trig: (
    <>
      <path d="M2 14 H26" strokeWidth="1" opacity="0.5" />
      <path d="M2 14 Q6 3 10 14 T18 14 T26 14" />
    </>
  ),
  kurve: (
    <>
      <path d="M3 21 Q8 3 14 14 Q20 25 25 7" />
      <circle className="pictogram__fill" cx="8.3" cy="10.2" r="1.8" />
      <circle className="pictogram__fill" cx="19.7" cy="17.8" r="1.8" />
    </>
  ),
  lgs: (
    <>
      <path d="M3 21 L25 8 M3 8 L25 21 M14 3 V25" />
      <circle className="pictogram__fill" cx="14" cy="14.5" r="2.2" />
    </>
  ),
  steckbrief: (
    <>
      <path d="M3 23 Q14 -1 25 21" />
      <circle className="pictogram__fill" cx="6.5" cy="16" r="1.8" />
      <circle className="pictogram__fill" cx="14" cy="11" r="1.8" />
      <circle className="pictogram__fill" cx="21.5" cy="14.5" r="1.8" />
    </>
  ),
  integral: (
    <>
      <path
        className="pictogram__area"
        d="M8 24 L8 13.6 Q14 7 20 9.5 L20 24 Z"
      />
      <path d="M3 21 Q14 3 25 13" />
      <path d="M3 24 H25" />
    </>
  ),
  modell: (
    <>
      <path d="M2 24 H26" />
      <path d="M4 24 Q14 0 24 24" />
      <circle className="pictogram__fill" cx="14" cy="12" r="2" />
    </>
  ),
  baum: (
    <>
      <path d="M4 14 L13 21 M13 7 L23 10 M13 21 L23 18 M13 21 L23 24" />
      <path className="pictogram__accent" d="M4 14 L13 7 L23 4" />
    </>
  ),
  glocke: (
    <>
      <path d="M2 23 C9 23 10 5 14 5 C18 5 19 23 26 23" />
      <path className="pictogram__accent" d="M14 5 V23" strokeDasharray="2 2" />
    </>
  ),
  gerade: (
    <>
      <path d="M6 4 V22 H25 M6 22 L2 26" opacity="0.6" />
      <path className="pictogram__accent" d="M3 19 L25 7" />
    </>
  ),
  ebene: (
    <>
      <path d="M3 20 L11 12 H25 L17 20 Z" />
      <path
        className="pictogram__accent"
        d="M14 16 V4 M14 4 L11.5 7 M14 4 L16.5 7"
      />
    </>
  ),
  prototyp: (
    <>
      <path d="M5 22 L7 16 L18 5 L23 10 L12 21 Z" />
      <path d="M16 7 L21 12" />
      <path className="pictogram__accent" d="M3 25.5 H15" />
    </>
  ),
  unterricht: (
    <>
      <rect x="3" y="4" width="22" height="15" rx="1.5" />
      <path d="M9 19 L7 25 M19 19 L21 25" />
      <path className="pictogram__accent" d="M7 13 Q10 7 13 11 T20 9" />
    </>
  ),
  demo: (
    <>
      <rect x="3" y="5" width="22" height="18" rx="2" />
      <path d="M3 10 H25" />
      <circle cx="6.5" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
      <path className="pictogram__accent" d="M8 15 H20 M8 19 H15" />
    </>
  ),
  presenter: (
    <>
      <rect x="3" y="4" width="22" height="14" rx="1.5" />
      <path d="M14 18 V23 M9 24.5 H19" />
      <text
        x="14"
        y="15"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        className="pictogram__fill"
      >
        ?
      </text>
    </>
  ),
  inhalte: (
    <>
      <path d="M8 3 H19 L23 7 V22 H8 Z" />
      <path d="M4.5 7 V25.5 H19" />
      <path
        className="pictogram__accent"
        d="M11.5 11 H19.5 M11.5 14.5 H19.5 M11.5 18 H16.5"
      />
    </>
  ),
  einsatz: (
    <>
      <rect x="3" y="6" width="22" height="19" rx="2" />
      <path d="M3 11 H25 M9 3 V8 M19 3 V8" />
      <circle cx="9" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="20.5" r="1.2" fill="currentColor" stroke="none" />
      <circle className="pictogram__fill" cx="14" cy="20.5" r="2" />
    </>
  ),
  lerntraining: (
    <>
      <path d="M5 14 A9 9 0 0 1 21 8" />
      <path d="M21.5 3 V8.5 H16" />
      <path className="pictogram__accent" d="M23 14 A9 9 0 0 1 7 20" />
      <path className="pictogram__accent" d="M6.5 25 V19.5 H12" />
    </>
  ),
  masterarbeit: (
    <>
      <path d="M5 3 H16 L20 7 V25 H5 Z" />
      <path d="M9 9 H15 M9 13 H13" />
      <circle className="pictogram__accent" cx="17" cy="18" r="4.5" />
      <path className="pictogram__accent" d="M20.3 21.3 L25 26" />
    </>
  ),
  lehrkraefte: (
    <>
      <circle cx="7" cy="9" r="2.5" opacity="0.6" />
      <path d="M2.5 20 Q7 13 11.5 20" opacity="0.6" />
      <circle cx="21" cy="9" r="2.5" opacity="0.6" />
      <path d="M16.5 20 Q21 13 25.5 20" opacity="0.6" />
      <circle className="pictogram__accent" cx="14" cy="12" r="3" />
      <path className="pictogram__accent" d="M8.5 25 Q14 16 19.5 25" />
    </>
  ),
  verein: (
    <>
      <path d="M14 25 V13" />
      <path d="M14 18 Q8 18 6 12 Q12 11 14 16" />
      <path
        className="pictogram__accent"
        d="M14 14 Q16 7 23 6 Q23 13 14 14 Z"
      />
      <path d="M6 25 H22" />
    </>
  ),
};

export function hasPictogram(id: string | undefined): id is string {
  return !!id && id in gallery;
}

export interface PictogramProps {
  /** Gallery id, e.g. "trig". Unknown or missing ids show the fallback. */
  id?: string | undefined;
  /** Shown as an initial when there is no pictogram. */
  fallbackLabel?: string | undefined;
  className?: string;
}

/** A pictogram tile. Decorative: the text next to it carries the meaning. */
export function Pictogram({ id, fallbackLabel, className }: PictogramProps) {
  return (
    <span
      className={["linie__tile", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {hasPictogram(id) ? (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {gallery[id]}
        </svg>
      ) : (
        <span className="linie__tile-initial">
          {fallbackLabel?.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
