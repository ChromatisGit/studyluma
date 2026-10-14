import type { ReactNode } from "react";

/** A section shared by the course overview and chapter content views. */
export function ResourceSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="teacher-controls-resource-section" aria-labelledby={id}>
      <h2 id={id} className="h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
