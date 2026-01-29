import { protectCodeBlocks } from "./codeBlockGuard";
import { parseContent } from "./parseContent";
import { readTypFile } from "@pipeline/io";
import { ContentIssueError, issueCatalog } from "@pipeline/errorHandling";
import { Page } from "@schema/page";

export async function parsePage(fileName: string, contentParsing = true): Promise<Page> {
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

    const content = parseContent(rawContent, protectedBlocks)

    return {
        title,
        content
    }
}



