/// <reference types="bun-types" />

import { Page } from "@/domain/page";
import { notFound } from "next/navigation";
import "server-only";

type Args = {
    subject: string;
    topicId: string;
    chapterId: string;
    worksheetId?: string;
};

export async function getPage(args: Args): Promise<Page> {
    const { subject, topicId, chapterId, worksheetId } = args;

    let sourcePath = [".generated", subject, topicId].join("/");

    sourcePath += worksheetId ? `/${chapterId}/worksheet/${worksheetId}.json` : `${chapterId}.json`;

    const file = Bun.file(sourcePath);
    if (!(await file.exists())) {
        return notFound()
    }

    let page: Page;
    try {
        page = await file.json();
    } catch {
        return notFound()
    }

    return page;
}
