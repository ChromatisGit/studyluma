import type { ReactNode } from "react";
import { ActionCard, CardBody } from "@chromatis/base/ui";

/** An action card: the whole card is one link with title, meta and a cue icon. */
export function LinkCard({
  to,
  title,
  meta,
  children,
  cue,
}: {
  to: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  cue?: ReactNode;
}) {
  return (
    <ActionCard to={to}>
      <CardBody>
        {meta && <span className="card__meta">{meta}</span>}
        <strong className="card__title">{title}</strong>
        {children}
      </CardBody>
      {cue}
    </ActionCard>
  );
}
