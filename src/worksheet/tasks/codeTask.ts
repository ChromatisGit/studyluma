import z from "zod";

import { TaskHandlerArgs } from "@worksheet/taskRegistry";
import { dedentFencedCodeBlocks, stripSharedIndentation } from "@worksheet/utils/text";

const codeLanguageSchema = z.enum(["ts", "python"]);
type CodeLanguage = z.infer<typeof codeLanguageSchema>;
const CODE_FENCE_REGEX =
  /^\s*```(?<language>[a-zA-Z0-9_-]+)?\s*\r?\n(?<code>[\s\S]*?)\r?\n\s*```/m;

export type CodeTask = {
  type: "code";
  instruction: string;
  hint: string;
  solution: string;
  starter: string;
  validation: string;
  language: CodeLanguage;
};

export function codeTaskHandler({
  body,
  inlineMacros,
}: TaskHandlerArgs): CodeTask {
  const instruction = dedentFencedCodeBlocks(
    stripSharedIndentation(body)
  ).trim();
  const hint = stripSharedIndentation(inlineMacros.hint ?? "").trim();
  const solution = dedentFencedCodeBlocks(
    stripSharedIndentation(inlineMacros.solution ?? "")
  ).trim();
  const starterRaw = stripSharedIndentation(inlineMacros.starter ?? "").trim();
  const validationRaw = stripSharedIndentation(
    inlineMacros.validation ?? ""
  ).trim();

  if (!instruction) {
    throw new Error("Code task requires an instruction.");
  }
  if (!starterRaw || !validationRaw) {
    throw new Error("Code task requires #starter[...] and #validation[...].");
  }
  if (!hint || !solution) {
    throw new Error("Code task requires #hint[...] and #solution[...].");
  }

  const starterBlock = parseCodeFence(starterRaw, "starter (#starter)");
  const validationBlock = parseCodeFence(
    validationRaw,
    "validation (#validation)"
  );

  const languageCandidate = validationBlock.language ?? starterBlock.language;
  if (!languageCandidate) {
    throw new Error(
      "Please specify a language in a code fence (```ts/```python) inside #validation or #starter."
    );
  }

  const language: CodeLanguage = codeLanguageSchema.parse(languageCandidate);

  return {
    type: "code",
    language,
    instruction,
    hint,
    solution,
    starter: starterBlock.code,
    validation: validationBlock.code,
  };
}

function parseCodeFence(
  raw: string,
  label: string
): { language?: string; code: string } {
  const match = CODE_FENCE_REGEX.exec(raw.trim());

  if (!match?.groups) {
    throw new Error(
      `${label} must be a fenced code block (\\\`\\\`\\\`lang\\n...\\\`\\\`\\\`).`
    );
  }

  const dedentedCode = stripSharedIndentation(match.groups.code ?? "").trimEnd();

  return {
    language: match.groups.language,
    code: dedentedCode,
  };
}
