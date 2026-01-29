import { restoreCodeBlocks } from "@pipeline/pageParser/codeBlockGuard";
import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { deterministicShuffle } from "@pipeline/pageParser/utils/simpleHash";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";

export type GapMacro = {
    type: "gap",
    parts: GapPart[];
}

type GapField = {
    mode: "text" | "mcq";
    correct: string[];
    options?: string[];
};

type GapPart =
    | { type: "text"; content: string }
    | { type: "gap"; gap: GapField };


export const gapMacro = defineMacro({
    type: "gap",
    parser,
    params: {
        empty: true
    }
});

function parser(node: RawMacro): GapMacro {
    const params = node.params as { empty: boolean };

    if (!node.content) {
        throw new Error("#gap requires a [ ... ]")
    }

    const content = restoreCodeBlocks(node.content, node.protectedBlocks).rawText;

    const matches = [...content.matchAll(GAP_PLACEHOLDER_REGEX)];
    if (matches.length === 0) {
        throw new Error("No gaps found in gap task.");
    }

    const parts: GapPart[] = [];
    let lastIndex = 0;

    for (const match of matches) {
        if (match.index == null) {
            throw new Error("Expected match.index to be defined");
        }

        const matchIndex = match.index;

        if (matchIndex > lastIndex) {
            const textPart = content.slice(lastIndex, matchIndex);
            parts.push({ type: "text", content: textPart });
        }

        const rawEntries = match[1]
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);

        const baseOptions = rawEntries.length ? rawEntries : [""];

        const correct = params.empty ? baseOptions.map(t => t.toLowerCase()) : [baseOptions[0]];

        const options = params.empty
            ? baseOptions
            : deterministicShuffle(baseOptions, match[1]);

        parts.push({
            type: "gap",
            gap: {
                mode: params.empty ? "text" : "mcq",
                correct,
                ...(params.empty ? {} : { options }),
            },
        });

        lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
        const trailing = content.slice(lastIndex);
        parts.push({ type: "text", content: trailing });
    }

    return {
        type: "gap",
        parts,
    };
}

const GAP_PLACEHOLDER_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;
