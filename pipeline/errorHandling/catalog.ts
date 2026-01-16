import { ContentIssue, createIssue } from "./issues";

function quoteList(items: string[]): string {
  return items.map((item) => `"${item}"`).join(", ");
}

export const issueCatalog = {
  generic(message: string): ContentIssue {
    return createIssue("content.invalid", message);
  },
  missingTitle(): ContentIssue {
    return {
      ...createIssue(
        "typ.missing_title",
        "Missing title.",
        "Add a line at the top: #title[Your Title]"
      ),
      line: 1,
      col: 1,
    };
  },
  fileReadFailed(): ContentIssue {
    return createIssue(
      "file.read_failed",
      "Could not read the file.",
      "Check that the file exists and is readable."
    );
  },
  yamlSyntax(message: string): ContentIssue {
    return createIssue(
      "yaml.syntax",
      `YAML syntax error: ${message}`,
      "Fix the YAML format or indentation."
    );
  },
  unknownMacro(macro: string): ContentIssue {
    return createIssue(
      "macro.unknown",
      `Unknown macro "#${macro}".`,
      "Check the macro name or remove it."
    );
  },
  invalidParamKey(macro: string, key: string): ContentIssue {
    return createIssue(
      "macro.param_invalid",
      `Unknown parameter "${key}" for #${macro}.`,
      "Remove it or fix the name."
    );
  },
  invalidParamType(macro: string, key: string, expected: string, actual: string): ContentIssue {
    return createIssue(
      "macro.param_type",
      `Wrong type for "${key}" in #${macro}. Expected ${expected}, got ${actual}.`,
      `Use a ${expected} value.`
    );
  },
  invalidInlineMacro(macro: string, names: string[]): ContentIssue {
    return createIssue(
      "macro.inline_invalid",
      `Invalid inline macro(s) in #${macro}: ${quoteList(names)}.`,
      "Remove or rename them."
    );
  },
  missingInlineMacro(macro: string, names: string[]): ContentIssue {
    return createIssue(
      "macro.inline_missing",
      `Missing required inline macro(s) in #${macro}: ${quoteList(names)}.`,
      "Add the missing inline macro(s)."
    );
  },
  unclosedMacroBlock(): ContentIssue {
    return createIssue(
      "macro.unclosed_block",
      "Unclosed [ ... ] block.",
      "Add a closing ]."
    );
  },
  missingChapterFolder(chapterId: string, expected: string): ContentIssue {
    return createIssue(
      "content.missing_chapter_folder",
      `Missing folder for chapter "${chapterId}".`,
      `Create a folder named ${expected}.`
    );
  },
  duplicateChapterFolder(chapterId: string, first: string, second: string): ContentIssue {
    return createIssue(
      "content.duplicate_chapter_folder",
      `Duplicate folder for chapter "${chapterId}": "${first}" and "${second}".`,
      "Keep only one folder for that chapter."
    );
  },
  missingFolder(path: string): ContentIssue {
    return createIssue(
      "content.missing_folder",
      "Folder not found.",
      `Create the folder: ${path}`
    );
  },
  invalidIcon(icon: string): ContentIssue {
    return createIssue(
      "icon.invalid",
      `Unknown icon "${icon}".`,
      "Pick a valid icon from https://lucide.dev/icons/."
    );
  },
  emptyOverviewContent(): ContentIssue {
    return createIssue(
      "content.empty_overview",
      "Overview page has no content."
    );
  },
};
