import type { ReactNode } from "react";
import { Card, CardBody, CardLink } from "@chromatis/base/ui";

/** An action card: one stretched link with title, meta and a cue icon. */
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
    <Card kind="action">
      <CardBody>
        {meta && <span className="card__meta">{meta}</span>}
        <CardLink className="card__title" to={to}>
          {title}
        </CardLink>
        {children}
      </CardBody>
      {cue}
    </Card>
  );
}
