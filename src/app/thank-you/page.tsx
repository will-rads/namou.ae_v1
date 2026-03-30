"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const REVIEWS = [
  {
    name: "Ahmad K.",
    role: "Investor",
    text: "The process was transparent and well-structured. I felt confident at every stage of the discussion.",
    stars: 5,
  },
  {
    name: "Sarah M.",
    role: "Developer",
    text: "Clear data, honest guidance, and no pressure. Exactly how a land deal should be handled.",
    stars: 5,
  },
  {
    name: "James R.",
    role: "Broker",
    text: "Professional and thorough. The ROI simulations were a real differentiator during client conversations.",
    stars: 5,
  },
  {
    name: "Lina T.",
    role: "Investor",
    text: "The deal structuring tools gave me a clear picture before committing. Very impressive platform.",
    stars: 5,
  },
  {
    name: "Omar H.",
    role: "Developer",
    text: "Straightforward process with real numbers. No fluff, just clarity from start to finish.",
    stars: 5,
  },
  {
    name: "Diana F.",
    role: "Advisor",
    text: "My clients were impressed by the level of detail. It made the entire conversation easier to navigate.",
    stars: 5,
  },
];

export default function ThankYouPage() {
  const [specialist, setSpecialist] = useState<string | null>(null);
  const [specialistEmail, setSpecialistEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const name = sessionStorage.getItem("Assignee_name");
      const email = sessionStorage.getItem("Assignee_email");
      if (name) setSpecialist(name);
      if (email) setSpecialistEmail(email);
    } catch {}
  }, []);

  const initials = specialist
    ? specialist.split(" ").map(w => w[0]).join("")
    : "NP";

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Background image — RAK aerial */}
      <Image
        src="/Thank-you-background.webp"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        quality={75}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-deep-forest/50" />

      {/* Logo — top-left */}
      <div className="relative z-10 px-4 sm:px-8 pt-5 sm:pt-6">
        <Image
          src="/logo.png"
          alt="Namou Properties"
          width={200}
          height={56}
          className="object-contain w-auto h-[5vh] sm:h-[7vh]"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-10">

        {/* Thank-you heading */}
        <div className="text-center mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-heading">
            Thank You
          </h1>
          <p className="text-sm sm:text-base text-white/70 mt-3 max-w-md mx-auto leading-relaxed">
            It was a pleasure guiding you through this opportunity. We look forward to the next step together.
          </p>
        </div>

        {/* Specialist + Reviews row */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">

          {/* Specialist frame */}
          <div className="md:w-[260px] shrink-0 bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mb-3">
              <span className="text-xl sm:text-2xl font-bold text-white/80 font-heading">
                {initials}
              </span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-white">
              {specialist ?? "Your Specialist"}
            </p>
            {specialistEmail && (
              <p className="text-xs text-white/60 mt-1">{specialistEmail}</p>
            )}
            <p className="text-xs text-white/50 mt-1 uppercase tracking-widest">
              Namou Properties
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 w-full">
              <p className="text-xs text-white/60 leading-relaxed">
                For any follow-up questions, your specialist is available to continue the conversation.
              </p>
            </div>
          </div>

          {/* Reviews frame */}
          <div className="flex-1 bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-5 sm:p-6 flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-3">
              Client Reviews
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {REVIEWS.map((review) => (
                <div
                  key={review.name}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    {Array.from({ length: review.stars }).map((_, i) => (
                      <svg key={i} className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[13px] text-white/80 leading-relaxed">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs font-medium text-white/90">{review.name}</p>
                    <span className="text-white/20">&middot;</span>
                    <p className="text-xs text-white/50">{review.role}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Review CTA — display text only, not a link or button */}
            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-xs text-white/60 leading-relaxed">
                Your specialist will share a short review link after the process.
                <span className="text-white/80 font-medium ml-1">
                  A few words from you help others make confident decisions.
                </span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
