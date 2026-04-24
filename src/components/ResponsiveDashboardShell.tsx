"use client";

import { useEffect, useState } from "react";

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 900;

function computeScale() {
  if (typeof window === "undefined") return 1;
  const widthScale = window.innerWidth / BASE_WIDTH;
  const heightScale = window.innerHeight / BASE_HEIGHT;
  const next = Math.min(widthScale, heightScale, 1);
  return Number.isFinite(next) && next > 0 ? next : 1;
}

export default function ResponsiveDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => setScale(computeScale());

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const shellWidth = Math.round(BASE_WIDTH * scale);
  const shellHeight = Math.round(BASE_HEIGHT * scale);

  return (
    <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-mint-white via-mint-bg to-mint-light/20">
      <div className="mx-auto flex min-h-full items-start justify-center">
        <div style={{ width: shellWidth, height: shellHeight }}>
          <div
            className="origin-top-left"
            style={{
              width: BASE_WIDTH,
              height: BASE_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
