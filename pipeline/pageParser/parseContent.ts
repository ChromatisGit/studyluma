import { Node, Section } from "@schema/page"
import { ProtectedBlock } from "./codeBlockGuard"
import { parseGroupMacro, parseMacro } from "./macros/parseMacro"
import { parseAndSplitRawText } from "@pipeline/pageParser/macros/parserUtils"
import { splitMacroAndText } from "./macros/splitMacroAndText"

export function parseContent(content: string, protectedBlocks: ProtectedBlock[], filePath: string): Section[] {
    const sections: Section[] = []

    const headerRegex = /^= (.+)$/gm
    const matches = [...content.matchAll(headerRegex)]

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const header = match[1].trim()

        const start = match.index! + match[0].length
        const end =
            matches[i + 1]?.index ?? content.length

        const sectionContent = content.slice(start, end).trim()

        const rawNodes = splitMacroAndText(sectionContent)

        const nodes: Node[] = rawNodes.flatMap((node): Node[] => {
            if ("rawText" in node) {
                return parseAndSplitRawText(node, protectedBlocks)
            }

            if (node.type === "group") {
                return [parseGroupMacro(node, protectedBlocks, filePath)]
            }

            return [parseMacro(node, protectedBlocks, filePath)]
        })

        sections.push({
            header,
            content: nodes,
        })
    }

    return sections;
}
