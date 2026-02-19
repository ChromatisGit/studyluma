import { getSession, assertAdminAccess } from "@services/authService";
import { notFound } from "next/navigation";

/*
  TODO: Should be a page where you can find all slides from all subjects.
  Like a file browser with subject / topic / chapter / slides
  where you can open each like a dropdown similar to Roadmap component.
*/

export default async function SlidesIndexPage() {
  const session = await getSession();
  assertAdminAccess(session);
  notFound();
}
