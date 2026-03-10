import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Namou Properties",
  description: "Real Estate Done Right — Namou land investment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
