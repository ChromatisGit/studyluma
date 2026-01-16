import { Page } from "@/domain/page";
import { notFound } from "next/navigation";
import "server-only";
import { readFile } from "fs/promises";
import { join } from "path";

type Args = {
    subject: string;
    topicId: string;
    chapterId: string;
    worksheetId?: string;
};

export async function getPage(args: Args): Promise<Page> {
    const { subject, topicId, chapterId, worksheetId } = args;

    let sourcePath = [".generated", subject, topicId].join("/");

    sourcePath += worksheetId ? `/${chapterId}/worksheets/${worksheetId}.json` : `/${chapterId}.json`;

    const fullPath = join(process.cwd(), sourcePath);

    let page: Page;
    try {
        const fileContent = await readFile(fullPath, "utf-8");
        page = JSON.parse(fileContent);
    } catch {
        notFound();
    }

    return page;
}
