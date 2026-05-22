import { redirect } from "react-router";

export async function loader({ params }: { params: { group?: string; course?: string } }) {
  if (!params.group || !params.course) throw new Response("Not found", { status: 404 });
  throw redirect(`/${params.group}/${params.course}`);
}

export default function Topic() {
  return null;
}
