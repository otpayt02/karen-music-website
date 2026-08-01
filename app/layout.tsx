import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karen Music Director Website",
  description: "A keyboard-first S’gaw Karen church music website, song database, and print workspace.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Karen Music Director Website",
    description: "S’gaw Karen chord charts, ready for rehearsal.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Karen Music Director chord-chart editor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Karen Music Director Website",
    description: "S’gaw Karen chord charts, ready for rehearsal.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}
