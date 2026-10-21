import { isRouteErrorResponse, Outlet, useLoaderData } from "react-router";
import type { loader } from "./root.server";
import { SiteProvider } from "../src/modules/classroom";
import { EmptyState, Page } from "@chromatis/base/ui";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "./app.css";
import TEXT from "./app.de.json";

export function meta() {
  return [{ title: TEXT.brand }];
}

export default function App() {
  const site = useLoaderData<typeof loader>();
  return (
    <SiteProvider site={site}>
      <Outlet />
    </SiteProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const details =
    import.meta.env.DEV && error instanceof Error ? error.message : undefined;
  return (
    <Page className="error-page">
      <EmptyState
        title={notFound ? TEXT.errors.notFoundTitle : TEXT.errors.title}
        description={
          details ?? (notFound ? TEXT.errors.notFound : TEXT.errors.generic)
        }
        nextStep={notFound ? TEXT.errors.notFoundNext : TEXT.errors.genericNext}
        actions={<a href="/">{TEXT.errors.home}</a>}
      />
    </Page>
  );
}
