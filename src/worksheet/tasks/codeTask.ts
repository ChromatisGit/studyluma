import z from "zod";

import { TaskHandlerArgs } from "@worksheet/taskRegistry";
import {
  dedentFencedCodeBlocks,
  stripSharedIndentation,
} from "@worksheet/utils/text";

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
  validation?: string;
  language: CodeLanguage;
};

type ParsedCodeFence = {
  language?: string;
  code: string;
};

export function codeTaskHandler({
  body,
  inlineMacros,
}: TaskHandlerArgs): CodeTask {
  const instruction = dedentFencedCodeBlocks(
    stripSharedIndentation(body),
  );

  const hint = stripSharedIndentation(inlineMacros.hint ?? "");
  const solution = dedentFencedCodeBlocks(
    stripSharedIndentation(inlineMacros.solution ?? ""),
  );
  const starterRaw = stripSharedIndentation(inlineMacros.starter ?? "");
  const validationRaw = stripSharedIndentation(
    inlineMacros.validation ?? "",
  );

  const { language, starterBlock, validationBlock } = validateCodeTask({
    instruction,
    hint,
    solution,
    starterRaw,
    validationRaw,
  });

  return {
    type: "code",
    language,
    instruction,
    hint,
    solution,
    starter: starterBlock.code,
    validation: validationBlock?.code,
  };
}

function validateCodeTask(args: {
  instruction: string;
  hint: string;
  solution: string;
  starterRaw: string;
  validationRaw: string;
}): {
  language: CodeLanguage;
  starterBlock: ParsedCodeFence;
  validationBlock: ParsedCodeFence | null;
} {
  const { instruction, hint, solution, starterRaw, validationRaw } = args;

  const errors: string[] = [];
  collectPresenceErrors({ instruction, hint, solution, starterRaw }, errors);

  const starterBlock = tryParseFence(starterRaw, "starter (#starter)", errors);
  const validationBlock = tryParseFence(
    validationRaw,
    "validation (#validation)",
    errors,
  );

  const languageCandidate =
    validationBlock?.language ?? starterBlock?.language;

  const language = resolveLanguage(languageCandidate, errors);

  if (errors.length > 0) {
    throw new Error(buildErrorMessage(instruction, errors));
  }

  // At this point we should have everything; if not, it's a programmer error.
  if (!starterBlock || !language) {
    throw new Error("Internal error while validating code task.");
  }

  return { language, starterBlock, validationBlock };
}

function collectPresenceErrors(
  args: {
    instruction: string;
    hint: string;
    solution: string;
    starterRaw: string;
  },
  errors: string[],
): void {
  const { instruction, hint, solution, starterRaw } = args;

  if (!instruction) {
    errors.push("Code task requires an instruction.");
  }
  if (!starterRaw) {
    errors.push("Code task requires #starter[...].");
  }
  if (!hint) {
    errors.push("Code task requires #hint[...].");
  }
  if (!solution) {
    errors.push("Code task requires #solution[...].");
  }
}

function tryParseFence(
  raw: string,
  label: string,
  errors: string[],
): ParsedCodeFence | null {
  if (!raw) {
    // Optional blocks may be empty; required blocks are validated separately.
    return null;
  }

  try {
    return parseCodeFence(raw, label);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : `Unknown error while parsing ${label} code block.`;
    errors.push(message);
    return null;
  }
}

function resolveLanguage(
  candidate: string | undefined,
  errors: string[],
): CodeLanguage | null {
  if (!candidate) {
    errors.push(
      "Please specify a language in a code fence (```ts```/```python```) inside #validation or #starter.",
    );
    return null;
  }

  const parsed = codeLanguageSchema.safeParse(candidate);
  if (!parsed.success) {
    errors.push(
      `Unsupported language "${candidate}". Use one of: ${codeLanguageSchema.options.join(
        ", ",
      )}.`,
    );
    return null;
  }

  return parsed.data;
}

function buildErrorMessage(instruction: string, errors: string[]): string {
  const preview =
    instruction
      ?.split("\n")[0]
      ?.trim()
      ?.slice(0, 80) || "(no instruction text)";

  return `Invalid code task (Instruction: "${preview}"):\n- ${errors.join("\n- ")}`;
}


function parseCodeFence(raw: string, label: string): ParsedCodeFence {
  const match = CODE_FENCE_REGEX.exec(raw.trim());

  if (!match?.groups) {
    throw new Error(
      `${label} must be a fenced code block (\`\`\`lang\n...\n\`\`\`).`,
    );
  }

  const dedentedCode = stripSharedIndentation(
    match.groups.code ?? "",
  ).trimEnd();

  return {
    language: match.groups.language,
    code: dedentedCode,
  };
}
