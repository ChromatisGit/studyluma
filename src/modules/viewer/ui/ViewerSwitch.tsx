import { Form, useLocation } from "react-router";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import type { ViewerRole } from "../domain/viewer";
import TEXT from "./viewer.de.json";

export interface ViewerSwitchProps {
  role: ViewerRole;
  /** Route that runs `switchViewer`. */
  action: string;
  /** Icon-only, for the collapsed sidebar and the phone masthead. */
  compact?: boolean;
}

/** Switches the stubbed role between student and teacher view. */
export function ViewerSwitch({
  role,
  action,
  compact = false,
}: ViewerSwitchProps) {
  const location = useLocation();
  const other: ViewerRole = role === "student" ? "teacher" : "student";
  return (
    <Form method="post" action={action} className="viewer-switch">
      <input type="hidden" name="role" value={other} />
      <input
        type="hidden"
        name="redirectTo"
        value={location.pathname + location.search}
      />
      {!compact && (
        <span className="shell__sidebar-footer-label">
          {fill(TEXT.current, { role: TEXT.roles[role] })}
        </span>
      )}
      {compact ? (
        <button
          type="submit"
          className="icon-btn"
          aria-label={TEXT.switchTo[other]}
          title={TEXT.switchTo[other]}
        >
          <ArrowLeftRight className="icon" aria-hidden="true" />
        </button>
      ) : (
        <Button type="submit" role="secondary" size="sm">
          <ArrowLeftRight className="icon" aria-hidden="true" />
          {TEXT.switchTo[other]}
        </Button>
      )}
    </Form>
  );
}
