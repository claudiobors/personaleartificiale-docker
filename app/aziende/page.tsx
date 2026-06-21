import type { Metadata } from "next";
import BusinessPage from "@/components/BusinessPage";

export const metadata: Metadata = {
  title: "PersonaleArtificiale per Aziende | Sistemi AI cloud e locali",
  description:
    "Sistemi di agenti IA in cloud e in locale per aziende produttive: audit gratuito, sicurezza, hardware per modelli locali e integrazioni con gestionali e dati operativi.",
  openGraph: {
    title: "PersonaleArtificiale per Aziende",
    description:
      "AI dentro dati, gestionale e processo produttivo. Audit gratuito, cloud, locale, sicurezza e integrazioni operative.",
    url: "https://personaleartificiale.it/aziende",
    siteName: "PersonaleArtificiale",
    locale: "it_IT",
    type: "website"
  }
};

export default function Aziende() {
  return <BusinessPage />;
}
