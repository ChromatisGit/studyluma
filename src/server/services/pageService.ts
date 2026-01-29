import "server-only";

import type { Page } from "@schema/page";
import { notFound } from "next/navigation";
import { getPage as getPageFromRepo } from "@providers/pageProvider";

type Args = {
  subject: string;
  topicId: string;
  chapterId: string;
  worksheetId?: string;
};

export async function getPage(args: Args): Promise<Page> {
  const page = await getPageFromRepo(args);
  if (!page) notFound();
  return page;
}
