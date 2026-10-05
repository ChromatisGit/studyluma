import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { colorModeInitScript, EmptyState, Page } from "@chromatis/base/ui";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "./app.css";
import { studyColorModeKey } from "./StudyShell";
import TEXT from "./app.de.json";

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

export default function App() {
  return <Outlet />;
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
        actions={<a href="/">{TEXT.errors.home}</a>}
      />
    </Page>
  );
}
