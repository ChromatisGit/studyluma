import type { Catalog, TaskPart } from "../src/modules/catalog";
import { getCatalog } from "../src/modules/catalog/server/catalog.server";
import { gapsOf } from "../src/modules/content-renderer";
import { checkGaps, checkPart } from "../src/modules/worksheets/domain/check";
import { checkMessages } from "../src/modules/worksheets/domain/checkMessages";
import type { CheckResult } from "../src/modules/worksheets";

type Located = { part: TaskPart };
const indexes = new Map<string, Map<string, Located>>();

function index(catalog: Catalog): Map<string, Located> {
  const known = indexes.get(catalog.buildId);
  if (known) {
    return known;
  }
  const found = new Map<string, Located>();
  const add = (task: { items: { type: string; part?: TaskPart }[] }) => {
    for (const item of task.items) {
      if (item.type === "part" && item.part) {
        found.set(item.part.id, { part: item.part });
      }
    }
  };
  for (const sheet of catalog.worksheets) {
    for (const section of sheet.sections) {
      for (const item of section.items) {
        if (item.type === "task") {
          add(item.task);
        }
      }
    }
  }
  catalog.challengePools.forEach((pool) => pool.challenges.forEach(add));
  indexes.set(catalog.buildId, found);
  return found;
}

/** The private part with this id of the given build, if there is one. */
export function findPart(
  buildId: string,
  partId: string,
): TaskPart | undefined {
  const catalog = getCatalog();
  return catalog.buildId === buildId
    ? index(catalog).get(partId)?.part
    : undefined;
}

/** Checks a submitted answer; `undefined` means unknown part or build. */
export function checkSubmitted(
  buildId: string,
  partId: string,
  value: unknown,
): CheckResult | undefined {
  const part = findPart(buildId, partId);
  if (!part) {
    return undefined;
  }
  return checkPart(part, value, checkMessages) ?? { state: "nochNicht" };
}

/** Checks the gaps of one Rechenweg step. */
export function checkSubmittedStep(
  buildId: string,
  partId: string,
  stepId: string,
  values: unknown,
): CheckResult | undefined {
  const step = findPart(buildId, partId)?.steps?.items.find(
    (item) => item.id === stepId,
  );
  if (!step) {
    return undefined;
  }
  const gaps = gapsOf([{ type: "paragraph", children: step.content }]);
  const own = checkGaps(
    gaps,
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {},
    checkMessages,
  );
  return own ?? { state: "nochNicht" };
}
