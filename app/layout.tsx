import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "PersonaleArtificiale | Un aiuto concreto nelle attivita quotidiane",
  description:
    "Team digitali AI su Telegram che gestiscono Gmail, appuntamenti, contenuti, documenti e automazioni aziendali 24/7.",
  icons: {
    icon: "/logo-pa-transparent.png"
  },
  openGraph: {
    title: "PersonaleArtificiale",
    description: "Un aiuto concreto nelle attivita quotidiane, direttamente su Telegram.",
    url: "https://personaleartificiale.it",
    siteName: "PersonaleArtificiale",
    locale: "it_IT",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={GeistSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
