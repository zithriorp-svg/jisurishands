"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!chart || chart.trim() === "") {
      setHasError(true);
      return;
    }

    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
      });

      const id = `mermaid-${Math.random().toString(36).substring(2, 10)}`;

      mermaid.default.parse(chart).then((isValid) => {
        if (isValid) {
          mermaid.default.render(id, chart).then((result) => {
            if (ref.current) {
              ref.current.innerHTML = result.svg;
              setHasError(false);
            }
          }).catch(() => setHasError(true));
        }
      }).catch(() => setHasError(true));
    });
  }, [chart]);

  if (hasError) {
    return (
      <div className="p-3 my-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-bold rounded-xl flex items-center gap-2">
        ⚠️ The AI's visual code was unstable and bypassed to protect the system.
      </div>
    );
  }

  return <div ref={ref} className="flex justify-center my-4 overflow-x-auto bg-[#09090b] p-4 rounded-xl border border-[#2a2a35] min-h-[50px]" />;
}
