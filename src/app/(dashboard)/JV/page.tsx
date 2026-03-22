"use client";

import { useState } from "react";
import ContentCard from "@/components/ContentCard";

type InvestmentModel = "build-sell" | "build-lease" | "build-hotel";

const MODELS: { id: InvestmentModel; label: string; tag: string; description: string }[] = [
  {
    id: "build-sell",
    label: "Build & Sell",
    tag: "Developer Exit",
    description:
      "Develop the land and sell completed units. The landowner contributes the plot, the investor funds construction, and both share proceeds from unit sales based on the agreed JV split.",
  },
  {
    id: "build-lease",
    label: "Build & Lease",
    tag: "Tenants",
    description:
      "Build residential or commercial units and lease them to tenants. Revenue is generated through recurring rental income, distributed between the landowner and investor over the hold period.",
  },
  {
    id: "build-hotel",
    label: "Build & Hotel",
    tag: "Operator Model",
    description:
      "Develop a hospitality asset and appoint a hotel operator. Returns are driven by room revenue and occupancy rates, shared between the landowner and the investor under the JV terms.",
  },
];

export default function JVPage() {
  const [selected, setSelected] = useState<InvestmentModel | null>(null);

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
          JV Simulator
        </h1>
        <p className="text-sm text-muted mt-1">
          New Core Engine — Joint-venture ROI modelling for landowners and investors.
        </p>
      </div>

      {/* Explanation */}
      <ContentCard>
        <h2 className="text-lg font-semibold text-deep-forest mb-2">
          How It Works
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          In a JV structure, a landowner contributes land while a developer or investor contributes
          capital. Both parties share the resulting profits based on an agreed split. The JV Simulator
          lets you model returns across different investment strategies so each side can evaluate the
          opportunity before committing.
        </p>
      </ContentCard>

      {/* Step 1 */}
      <div className="flex flex-col flex-1 min-h-0">
        <ContentCard className="flex flex-col flex-1">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white bg-forest px-2 py-0.5 rounded-full">
                Step 1
              </span>
              <h2 className="text-lg font-semibold text-deep-forest">
                Select Investment Model
              </h2>
            </div>
            <p className="text-xs text-muted">
              Choose how the joint venture will generate returns. Each model has different ROI logic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 auto-rows-fr">
            {MODELS.map((m) => {
              const isActive = selected === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`flex flex-col items-start text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? "bg-forest text-white border-forest shadow-sm"
                      : "bg-white border-mint-light hover:border-forest/30 hover:shadow-md"
                  }`}
                >
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-forest/10 text-forest"
                    }`}
                  >
                    {m.tag}
                  </span>
                  <span className="text-base font-bold mb-1">{m.label}</span>
                  <span
                    className={`text-xs leading-relaxed ${
                      isActive ? "text-white/80" : "text-muted"
                    }`}
                  >
                    {m.description}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted mt-3">
            Each model applies distinct assumptions for construction costs, revenue projections, and
            profit-sharing timelines.
          </p>
        </ContentCard>
      </div>
    </div>
  );
}
