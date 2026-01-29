import { RawText } from "@pipeline/types";
import { removeIndent } from "@pipeline/pageParser/utils/removeIndent";

export type RawMacroBlock = {
  type: string;
  params?: string;
  content?: string;
};

export type RawNode = RawMacroBlock | RawText;

export function splitMacroAndText(content: string): RawNode[] {
  const out: RawNode[] = [];
  let i = 0;

  while (i < content.length) {
    if (content[i] === "#") {
      macroRegEx.lastIndex = i;
      const match = macroRegEx.exec(content);

      if (match?.groups?.kind) {
        const macro: RawMacroBlock = { type: match.groups.kind };
        const params = match.groups.params;
        if (params) {
          const trimmedParams = params.trim();
          if (trimmedParams.length > 0) macro.params = trimmedParams;
        }

        let end = macroRegEx.lastIndex;
        if (content[end] === "[") {
          const macroBlock = readBalancedSquare(content, end);
          macro.content = macroBlock.content.trim();
          end = macroBlock.end;
        }

        out.push(macro);
        i = end;
        continue;
      }
    }

    const nextHash = content.indexOf("#", i + 1);
    const end = nextHash === -1 ? content.length : nextHash;
    const trimmedText = content.slice(i, end).trim();
    if (trimmedText.length > 0) {
      out.push({ rawText: trimmedText });
    }
    i = end;
  }

  return out;
}

const macroRegEx = /#(?<kind>[A-Za-z_]\w*)(?:\((?<params>[^)]*)\))?/y;

function readBalancedSquare(src: string, openIdx: number): { content: string; end: number } {
  // src[openIdx] must be '['
  let i = openIdx + 1;
  let depth = 1;
  let indent = 0
  let firstRow = true

  while (i < src.length) {
    const ch = src[i++];

    // Meassure indent
    if(firstRow) {
      if(/\s/.test(ch)) {
        indent++;
      }
      else {
        firstRow = false;
      }
    }

    if (ch === "[") depth++;
    else if (ch === "]") depth--;

    if (depth === 0) {
      const content = removeIndent(src.slice(openIdx + 1, i - 1), indent)
      return { content, end: i };
    }
  }

  throw new Error(`Unclosed macro content: "[" at index ${openIdx}`);
}


