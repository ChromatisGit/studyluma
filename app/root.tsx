import type { ReactNode } from "react";
import type { LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import { loadSite } from "./site.server";
import { SiteProvider } from "../src/modules/classroom";
import { colorModeInitScript, EmptyState, Page } from "@chromatis/base/ui";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "./app.css";
import TEXT from "./app.de.json";

const studyColorModeKey = "studyluma:color-mode";

export function meta() {
  return [
    { title: TEXT.brand },
    { name: "description", content: TEXT.description },
  ];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" data-brand="studyluma" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: colorModeInitScript(studyColorModeKey),
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  return await loadSite(request);
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
