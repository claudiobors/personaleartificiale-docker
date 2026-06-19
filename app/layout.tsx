import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personale Artificiale | Dipendenti digitali AI su WhatsApp",
  description:
    "Assistenti digitali AI per WhatsApp e Telegram che gestiscono email, appuntamenti, contenuti e automazioni aziendali 24/7.",
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Personale Artificiale",
    description: "Assumi il tuo primo dipendente digitale su WhatsApp o Telegram.",
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
