import type { Metadata, Viewport } from "next";
import { DM_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { readRowsOrSeed } from "@/lib/store";

const dmSans = DM_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-sans",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "Namou Properties",
  description: "Real Estate Done Right — Namou land investment platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force dynamic rendering so we always read the latest server-side data
  await headers();

  let serverDataScript = "";
  try {
    const rows = await readRowsOrSeed();
    serverDataScript = JSON.stringify(rows).replace(/<\//g, "<\\/");
  } catch { /* read error — client falls back to localStorage */ }

  return (
    <html lang="en" className={`${dmSans.variable} ${robotoMono.variable}`}>
      <body className="antialiased h-dvh overflow-hidden">
        {serverDataScript && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__NAMOU_SERVER_DATA__=${serverDataScript};`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
