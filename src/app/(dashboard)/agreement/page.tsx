"use client";

import Link from "next/link";
import ContentCard from "@/components/ContentCard";

const agreements = [
  {
    title: "Property Introduction Form",
    titleAr: "نموذج تعريف العقار",
    description:
      "Introduce an investor to a specific Namou property. Captures investor details, property summary, and a digital signature.",
    href: "/agreement/property-introduction",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    title: "A2A Agreement",
    titleAr: "اتفاقية وسيط إلى وسيط",
    description:
      "Formalise a referral between agents. Captures Party B details, referred investor info, and a binding digital signature.",
    href: "/agreement/a2a",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function AgreementPage() {
  return (
    <div className="flex flex-col flex-1 gap-6 animate-fade-in">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-forest font-heading">Agreement</h1>
        <p className="text-sm text-muted mt-1">
          Select the agreement type to proceed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {agreements.map((a) => (
          <Link key={a.href} href={a.href} className="group flex">
            <ContentCard className="w-full flex flex-col transition-all group-hover:shadow-md group-hover:border-forest/30">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-forest/10 text-forest">
                  {a.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-deep-forest">{a.title}</h2>
                  <p className="text-sm text-forest/60 font-medium" dir="rtl">{a.titleAr}</p>
                  <p className="text-sm mt-2 text-muted leading-relaxed">{a.description}</p>
                </div>
              </div>

              <div className="mt-auto pt-6 flex items-center text-xs font-medium text-forest opacity-0 group-hover:opacity-100 transition-opacity">
                Open form
                <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </ContentCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
