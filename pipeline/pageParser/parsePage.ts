import { protectCodeBlocks } from "./codeBlockGuard";
import { parseContent } from "./parseContent";
import { readTypFile } from "@pipeline/io";
import { ContentIssueError, issueCatalog } from "@pipeline/errorHandling";
import { Page } from "@schema/page";
import type { ContentType } from "./macros/parserUtils";

export async function parsePage(fileName: string, contentParsing = true, contentType?: ContentType): Promise<Page> {
    const fileContent = await readTypFile(fileName);

    const { protectedContent, protectedBlocks } = protectCodeBlocks(fileContent)

    const titleRegex = /^#title\[(?<title>[^\]]+)\]$/m;
    const titleMatch = titleRegex.exec(protectedContent);
    if (!titleMatch?.groups?.title) {
        throw new ContentIssueError(issueCatalog.missingTitle());
    }
    const title = titleMatch.groups.title.trim();

    if (!contentParsing) {
        return { title }
    }

    const startIndex = titleMatch.index + titleMatch[0].length;
    const rawContent = protectedContent.slice(startIndex).trim();

    const content = parseContent(rawContent, protectedBlocks, fileName, contentType)

    return {
        title,
        content
    }
}



