import type { Metadata } from "next";
import { DM_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { headers } from "next/headers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force dynamic rendering so we always read the latest server-side data
  await headers();

  let serverDataScript = "";
  try {
    const filePath = join(process.cwd(), "data", "spreadsheet-override.json");
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf-8");
      JSON.parse(raw); // validate JSON before injecting
      // Escape closing script tags to prevent XSS
      serverDataScript = raw.replace(/<\//g, "<\\/");
    }
  } catch { /* no override file — use built-in defaults */ }

  return (
    <html lang="en" className={`${dmSans.variable} ${robotoMono.variable}`}>
      <body className="antialiased h-screen overflow-hidden">
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
