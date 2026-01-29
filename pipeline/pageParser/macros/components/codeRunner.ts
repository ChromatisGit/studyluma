import { getProtectedBlockFromInlineMacro } from "@pipeline/pageParser/codeBlockGuard";
import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { CodeLanguage } from "@pipeline/pageParser/macros/tasks/codeTask";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";

export type CodeRunnerMacro = {
    type: "codeRunner",
    code: string,
    language: CodeLanguage,
}

export const codeRunnerMacro = defineMacro({
    type: "codeRunner",
    parser
});

function parser(node: RawMacro): CodeRunnerMacro {
    if(!node.content) {
        throw new Error("#codeRunner must be a fenced code block [ (\`\`\`lang\n...\n\`\`\`) ]")
    }

    const code = getProtectedBlockFromInlineMacro(
        node.content.rawText,
        node.protectedBlocks,
        "#codeRunner must be a fenced code block (\`\`\`lang\n...\n\`\`\`)",
        { requireLang: true }
    )

    const language = code.lang
    if (language !== "ts" && language !== "python") {
        throw new Error(`#codeRunner: unsupported language "${language}"`)
    }

    return {
        type: "codeRunner",
        code: code.text,
        language
    }
}
