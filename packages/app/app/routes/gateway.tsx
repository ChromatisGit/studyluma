import { useLoaderData } from "react-router";
import { Alert, Page, PageHeader } from "@chromatis/base/ui";
import TEXT from "../../src/modules/classroom/ui/classroom.de.json";
import type { loader } from "./gateway.server";

export function meta() {
  return [{ title: TEXT.join.title }];
}

/** Shown only when `studyluma.org/CODE` leads nowhere; a live code redirects. */
export default function GatewayRoute() {
  const { failure } = useLoaderData<typeof loader>();
  return (
    <Page title={TEXT.join.title} width="content">
      <PageHeader title={TEXT.join.title} />
      <Alert status="error">{TEXT.join[failure]}</Alert>
    </Page>
  );
}
