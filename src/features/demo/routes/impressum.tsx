import { Container } from "@components/Container";
import { SiteFooter } from "./SiteFooter";

export function meta() {
  return [
    { title: "Impressum — StudyLuma" },
  ];
}

export default function ImpressumPage() {
  return (
    <>
      <main style={{ minHeight: "100vh", paddingBlock: "3rem" }}>
        <Container size="narrow">
          <nav className="md:hidden" style={{ marginBottom: "2.5rem" }}>
            <a href="/" style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
              ← Zurück zur Startseite
            </a>
          </nav>

          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>Impressum</h1>

          <section style={{ display: "flex", flexDirection: "column", gap: "1rem", lineHeight: 1.7 }}>
            <p>
              StudyLuma ist ein nicht-kommerzielles Bildungs- und Open-Source-Entwicklungsprojekt von Christian Holst.
            </p>

            <p>
              Kontakt:{" "}
              <a href="mailto:christian.contactmail@gmail.com" style={{ color: "var(--primary)" }}>
                christian.contactmail@gmail.com
              </a>
            </p>

            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
              Meine private Wohnanschrift wird aus Gründen des persönlichen Schutzes nicht öffentlich
              angegeben. Für berechtigte rechtliche Anliegen kann eine ladungsfähige Anschrift per
              E-Mail angefragt werden.
            </p>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
