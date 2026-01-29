import { getProtectedBlockFromInlineMacro } from "@pipeline/pageParser/codeBlockGuard";
import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "@pipeline/pageParser/macros/parseRawText";


export type CodeLanguage = "ts" | "python"

export type CodeTaskMacro = {
    type: "codeTask",
    instruction: Markdown;
    hint: Markdown;
    solution: Markdown;
    starter: string;
    validation?: string;
    language: CodeLanguage;
};

export const codeTaskMacro = defineMacro({
    type: "codeTask",
    parser,
    inline: {
        hint: "required",
        solution: "required",
        starter: "required",
        validation: "optional"
    }
});

function parser(node: RawMacro): CodeTaskMacro {
    if (!node.content) {
        throw new Error("#codeTask requires an instruction.")
    }

    const starterBlock = getProtectedBlockFromInlineMacro(
        node.inlineMacros!.starter.rawText,
        node.protectedBlocks,
        "#codeTask: #starter must be a fenced code block (\`\`\`lang\n...\n\`\`\`)",
        { requireLang: true }
    )

    const language = starterBlock.lang
    if (language !== "ts" && language !== "python") {
        throw new Error(`#codeTask: unsupported language "${language}"`)
    }

    const starter = starterBlock.text

    let validation: string | undefined
    const validationRaw = node.inlineMacros!.validation?.rawText
    if (validationRaw) {
        const validationBlock = getProtectedBlockFromInlineMacro(
            validationRaw,
            node.protectedBlocks,
            "#codeTask: #validation must be a fenced code block (\`\`\`lang\n...\n\`\`\`)"
        )

        validation = validationBlock.text
    }

    return {
        type: "codeTask",
        instruction: parseRawText(node.content, node.protectedBlocks),
        hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
        solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks),
        starter,
        validation,
        language
    }
}
