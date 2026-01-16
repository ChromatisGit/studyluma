import { RawText } from "@schema/page";
import { removeIndent } from "./utils/removeIndent";

export type ProtectedBlock = {
    lang?: string;
    text: string;
};

export function protectCodeBlocks(content: string): {
    protectedContent: string;
    protectedBlocks: ProtectedBlock[];
} {
    const protectedBlocks: ProtectedBlock[] = [];

    const TOKEN = "\uFFFF";

    const makePlaceholder = (i: number) => `${TOKEN}${i}${TOKEN}`;

    // Protect fenced raw blocks: ```lang?\n ... \n```
    const fenced = /^(?<indent> *)(?<ticks>`{3,})[ \t]*(?<info>[^\n]*)\n(?<body>[\s\S]*?)\n^\k<indent>\k<ticks>[ \t]*$/gm;

    let protectedContent = content.replace(
        fenced,
        (_match, indent, _ticks, info, body) => {
            const lang = String(info ?? "").trim() || undefined;
            const placeholder = makePlaceholder(protectedBlocks.length);
            const text = removeIndent(String(body ?? ""), indent.length ?? 0)
            protectedBlocks.push({ lang, text });
            return placeholder;
        }
    );

    const inline = /(?<ticks>`+)(?<text>[\s\S]*?)\k<ticks>/g;

    protectedContent = protectedContent.replace(inline, (match, _ticks, text) => {
        if (match.includes(TOKEN)) return match;

        const placeholder = makePlaceholder(protectedBlocks.length);
        protectedBlocks.push({ text: String(text ?? "") });
        return placeholder;
    });

    return { protectedContent, protectedBlocks };
}

export const codeBlockGuardRegex = /\uFFFF(\d+)\uFFFF/g;

export function restoreCodeBlocks(protectedContent: RawText, protectedBlocks: ProtectedBlock[]): RawText {
    return {
        rawText: protectedContent.rawText.replace(codeBlockGuardRegex, (match, indexText) => {
            const index = Number(indexText);
            const block = protectedBlocks[index];
            if (!block) return match;

            const text = String(block.text ?? "");
            const isFenced = block.lang !== undefined || /[\r\n]/.test(text);

            if (isFenced) {
                const lang = block.lang ? String(block.lang) : "";
                return `\`\`\`${lang}\n${text}\n\`\`\``;
            }

            return `\`${text}\``;
        })
    };
}

type ProtectedBlockOptions = {
    requireLang?: boolean;
};

export function getProtectedBlockFromInlineMacro(
    rawText: string,
    protectedBlocks: ProtectedBlock[],
    errorMessage: string,
    options?: { requireLang?: false }
): ProtectedBlock;
export function getProtectedBlockFromInlineMacro(
    rawText: string,
    protectedBlocks: ProtectedBlock[],
    errorMessage: string,
    options: { requireLang: true }
): ProtectedBlock & { lang: string };
export function getProtectedBlockFromInlineMacro(
    rawText: string,
    protectedBlocks: ProtectedBlock[],
    errorMessage: string,
    options?: ProtectedBlockOptions
): ProtectedBlock {
    codeBlockGuardRegex.lastIndex = 0;
    const match = codeBlockGuardRegex.exec(rawText);
    if (!match) {
        throw new Error(errorMessage);
    }

    const index = Number(match[1]);
    const block = protectedBlocks[index];
    if (!block) {
        throw new Error(errorMessage);
    }

    if (options?.requireLang && !block.lang) {
        throw new Error(errorMessage);
    }

    return block;
}

