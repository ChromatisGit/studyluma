import type { Page } from "@schema/page";
import { getChapterContent, getWorksheetContent } from "@platform/content.server";

type Args = {
  subject: string;
  topicId: string;
  chapterId: string;
  worksheetId?: string;
};

export async function getPage(args: Args): Promise<Page> {
  const page = args.worksheetId
    ? await getWorksheetContent({
        subject: args.subject,
        topicId: args.topicId,
        chapterId: args.chapterId,
        worksheetId: args.worksheetId,
      })
    : await getChapterContent({
        subject: args.subject,
        topicId: args.topicId,
        chapterId: args.chapterId,
      });

  if (!page) throw new Response("Not found", { status: 404 });
  return page;
}
