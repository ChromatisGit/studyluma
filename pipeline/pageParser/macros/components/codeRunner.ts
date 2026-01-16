import { getProtectedBlockFromInlineMacro } from "../../codeBlockGuard";
import { RawMacro } from "../parseMacro";
import { CodeLanguage } from "../tasks/codeTask";
import { defineMacro } from "../macroDefinition";

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
