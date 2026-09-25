import { z } from "zod";
import { getDatabase } from "./server";
import type { WebsiteLoadContext } from "./server";

export const bundleSchema = z.object({
  schemaVersion: z.literal(1),
  topic: z.object({ id: z.string().min(1).max(120), title: z.string().min(1).max(200) }),
  chapter: z.object({ id: z.string().min(1).max(120), title: z.string().min(1).max(200), body: z.string().max(100000) }),
  worksheets: z.array(z.object({ id: z.string().min(1).max(120), publicKey: z.uuid(), title: z.string().min(1).max(200), body: z.string().max(100000) })).max(30),
});

export type Bundle = z.infer<typeof bundleSchema>;

export async function publishBundle(bundle: Bundle, context: WebsiteLoadContext): Promise<void> {
  await getDatabase(context).anonTransaction(async sql => {
    await sql`INSERT INTO topics (id, title) VALUES (${bundle.topic.id}, ${bundle.topic.title}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`;
    await sql`
      INSERT INTO chapters (id, topic_id, title, body)
      VALUES (${bundle.chapter.id}, ${bundle.topic.id}, ${bundle.chapter.title}, ${bundle.chapter.body})
      ON CONFLICT (id) DO UPDATE SET topic_id = EXCLUDED.topic_id, title = EXCLUDED.title, body = EXCLUDED.body
    `;
    for (const worksheet of bundle.worksheets) {
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO worksheets (id, chapter_id, public_key, title, body)
        VALUES (${worksheet.id}, ${bundle.chapter.id}, ${worksheet.publicKey}::uuid, ${worksheet.title}, ${worksheet.body})
        ON CONFLICT (id) DO UPDATE SET chapter_id = EXCLUDED.chapter_id, title = EXCLUDED.title, body = EXCLUDED.body
        WHERE worksheets.public_key = EXCLUDED.public_key
        RETURNING id
      `;
      if (!rows[0]) throw new Error(`Public key changed for worksheet ${worksheet.id}`);
    }
  });
}
