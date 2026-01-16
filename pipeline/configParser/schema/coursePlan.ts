import { z } from "zod";
import type { GroupDefinitions } from "./definitions";
import {
  yamlCoursePlanSchema,
  type YamlCoursePlan,
} from "./yamlCoursePlan";
import { Course, WorksheetFormat } from "@schema/course";
import { resolveLucideIcon } from "../validateLucideIcons";
import { makeGroupKey, makeCourseId, makeCourseSlug, makeSubjectKey } from "../../../src/server/lib/makeIds";

export type CoursePlan = Omit<Course, "topics"> & {
  worksheetFormat: WorksheetFormat;
  topics: YamlCoursePlan["topics"];
  courseFolder: string;
};


export function createCoursePlanSchema(definitions: GroupDefinitions, principlesFiles: Set<string>) {
  const groupYearToPrinciples = new Map<string, string>();

  return yamlCoursePlanSchema.superRefine((v, ctx) => {
    if (!definitions.groups[v.course.group]) {
      addIssue(ctx, ["course", "group"], `Group '${v.course.group}' is not defined in definitions.yml`);
    }

    if (!definitions.subjects[v.course.subject]) {
      addIssue(
        ctx,
        ["course", "subject"],
        `Subject '${v.course.subject}' is not defined in definitions.yml`
      );
    }

    if (v.course.variant && !definitions.variants[v.course.variant]) {
      addIssue(
        ctx,
        ["course", "variant"],
        `Variant '${v.course.variant}' is not defined in definitions.yml`
      );
    }

    if (v.principlesFile && !principlesFiles.has(v.principlesFile)) {
      addIssue(
        ctx,
        ["principlesFile"],
        `Principles file '${v.principlesFile}' does not exist in content/principles.`
      );
    }

    if (v.course.icon !== undefined) {
      const rawIcon = v.course.icon;
      const resolvedIcon = resolveLucideIcon(rawIcon);
      if (!resolvedIcon) {
        addIssue(ctx, ["course", "icon"], `Unknown icon "${rawIcon}".`);
      } else {
        v.course.icon = resolvedIcon;
      }
    }

    if (v.principlesFile) {
      const key = makeGroupKey(v.course);
      const expected = groupYearToPrinciples.get(key);

      if (expected && expected !== v.principlesFile) {
        const yearLabel = v.course.year !== undefined ? ` (year ${v.course.year})` : "";
        addIssue(
          ctx,
          ["principlesFile"],
          `Group '${v.course.group}'${yearLabel} already uses principles file '${expected}', not '${v.principlesFile}'.`
        );
      } else if (!expected) {
        groupYearToPrinciples.set(key, v.principlesFile);
      }
    }
  }).transform(toCoursePlan(definitions));
}

function toCoursePlan(definitions: GroupDefinitions) {
  return (v: YamlCoursePlan): CoursePlan => {
    const groupDef = definitions.groups[v.course.group];
    const subjectDef = definitions.subjects[v.course.subject];

    const variantId = v.course.variant;
    const variantDef = variantId ? definitions.variants[variantId] : undefined;

    const icon = v.course.icon ?? subjectDef.icon ?? "Square";

    return {
      id: makeCourseId(v.course),
      group: {
        id: v.course.group,
        label: groupDef.name,
        key: makeGroupKey(v.course)
      },
      subject: {
        id: v.course.subject,
        label: subjectDef.name,
        key: makeSubjectKey(v.course)
      },
      courseVariant: variantId
        ? {
            id: variantId,
            label: variantDef?.name ?? variantId,
            short: variantDef?.short ?? variantId.slice(0, 6),
          }
        : undefined,
      slug: makeCourseSlug(v.course),
      worksheetFormat: v.worksheetFormat,
      icon,
      color: groupDef.color,
      isListed: v.isListed,
      isPublic: v.isPublic,
      courseFolder: "",
      topics: v.topics,
    };
  };
}

function addIssue(ctx: z.RefinementCtx, path: (string | number)[], message: string) {
  ctx.addIssue({ code: "custom", path, message });
}
