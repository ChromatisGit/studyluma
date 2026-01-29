import { Subheader, Markdown, createMarkdown } from "@schema/page";
import { RawText } from "@pipeline/types";
import { ProtectedBlock, restoreCodeBlocks } from "@pipeline/pageParser/codeBlockGuard";

const SUBHEADER_REGEX = /^==\s+(.+)$/gm;

export function parseAndSplitRawText(
    rawText: RawText,
    protectedBlocks: ProtectedBlock[]
): (Markdown | Subheader)[] {
    const src = rawText.rawText;
    const matches = [...src.matchAll(SUBHEADER_REGEX)];

    if (matches.length === 0) {
        return [parseRawText(rawText, protectedBlocks)];
    }

    const nodes: (Markdown | Subheader)[] = [];
    let lastIndex = 0;

    for (const match of matches) {
        if (match.index == null) {
            throw new Error("Expected subheader match.index to be defined");
        }

        const before = src.slice(lastIndex, match.index).trim();
        if (before.length > 0) {
            nodes.push(parseRawText({ rawText: before }, protectedBlocks));
        }

        const headerText = match[1].trim();
        if (headerText.length > 0) {
            nodes.push({
                type: "subheader",
                header: parseRawText({ rawText: headerText }, protectedBlocks),
            });
        }

        lastIndex = match.index + match[0].length;
    }

    const after = src.slice(lastIndex).trim();
    if (after.length > 0) {
        nodes.push(parseRawText({ rawText: after }, protectedBlocks));
    }

    return nodes;
}

// Replaces selected Typst syntax with Markdown Syntax for rendering purposes
export function parseRawText(
    { rawText }: RawText,
    protectedBlocks: ProtectedBlock[]
): Markdown {
    const converted = rawText.replace(/\*(.*?)\*/g, "**$1**");
    const restored = restoreCodeBlocks({ rawText: converted }, protectedBlocks).rawText;
    return createMarkdown(restored);
}
