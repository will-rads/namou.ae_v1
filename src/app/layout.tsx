import type { Metadata } from "next";
import { DM_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${robotoMono.variable}`}>
      <body className="antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
