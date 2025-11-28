import React from "react";
import type { RenderMode, Worksheet } from "../../../../src/worksheet/types";
import { WorksheetPage as CoreWorksheetPage } from "../../../../src/worksheet/components/Worksheet";

import "../../../../src/worksheet/css/worksheet.css";

type Props = {
  worksheet: Worksheet;
  mode?: RenderMode;
};

export function WorksheetPage({ worksheet, mode }: Props) {
  return <CoreWorksheetPage worksheet={worksheet} mode={mode} />;
}
