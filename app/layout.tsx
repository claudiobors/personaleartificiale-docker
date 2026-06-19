import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personale Artificiale | Dipendenti digitali AI su Telegram",
  description:
    "Team digitali AI su Telegram che gestiscono Gmail, appuntamenti, contenuti, documenti e automazioni aziendali 24/7.",
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Personale Artificiale",
    description: "Assumi il tuo primo dipendente digitale su Telegram.",
    url: "https://personaleartificiale.it",
    siteName: "Personale Artificiale",
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
