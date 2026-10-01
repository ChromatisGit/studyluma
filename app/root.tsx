import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import {
  Page,
  PageHeader,
  TextLink,
  colorModeInitScript,
} from "@chromatis/base/ui";
import { StudyShell } from "./StudyShell";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "./styles.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-brand="studyluma" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: colorModeInitScript("studyluma:color-mode"),
          }}
        />
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
  return (
    <StudyShell>
      <Outlet />
    </StudyShell>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const message = isRouteErrorResponse(error)
    ? `${error.status}: ${error.statusText || "Nicht gefunden"}`
    : "Ein Fehler ist aufgetreten";
  return (
    <StudyShell>
      <Page>
        <PageHeader title={message} />
        <TextLink to="/">Zur Startseite</TextLink>
      </Page>
    </StudyShell>
  );
}
