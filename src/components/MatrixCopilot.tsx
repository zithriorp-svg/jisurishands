"use client";

import { useState } from "react";
import Mermaid from "./Mermaid";

export default function MatrixCopilot() {
  const [response, setResponse] = useState("Matrix Online. Visual Cortex shielded and synchronized with live database. Ask me to map out a strategic forecast, query live stats, or generate a lending flowchart.");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: any) => {
    e.preventDefault();
    const prompt = e.target.prompt.value;
    if (!prompt) return;
    setLoading(true);
    setResponse("Analyzing Vault telemetry and generating strategic models...");

    try {
      // 🚀 FIXED: Pointing to the correct API route
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      setResponse(data.reply);
      e.target.prompt.value = "";
    } catch (err) {
      setResponse("Matrix Error: Neural link to database severed.");
    }
    setLoading(false);
  };

  const renderContent = (text: string) => {
    const regex = /```mermaid([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: text.slice(lastIndex, match.index).replace(/\n/g, '<br/>') }} />);
      }
      parts.push(<Mermaid key={`chart-${match.index}`} chart={match[1].trim()} />);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: text.slice(lastIndex).replace(/\n/g, '<br/>') }} />);
    }

    return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }} />;
  };

  return (
    <details className="bg-[#0f0f13] border border-[#00df82]/40 rounded-2xl shadow-[0_0_20px_rgba(0,223,130,0.1)] group mt-6">
      <summary className="flex items-center justify-between cursor-pointer p-5 list-none">
        <h2 className="text-[#00df82] font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <span>🧠</span> 
          <span className="group-open:hidden">[Tap to Expand] AI Strategic Forecaster</span>
          <span className="hidden group-open:inline">[Tap to Collapse] AI Strategic Forecaster</span>
        </h2>
        <svg 
          className="w-5 h-5 text-[#00df82] transition-transform duration-200 group-open:rotate-180" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      
      <div className="px-5 pb-5">
        <div className="bg-[#1c1c21] p-4 rounded-xl text-sm text-gray-300 leading-relaxed mb-4 min-h-[100px] border border-[#2a2a35] overflow-x-auto">
          {renderContent(response)}
        </div>

        <form onSubmit={handleAsk} className="flex gap-3">
          <input
            name="prompt"
            placeholder="e.g. How many overdue installments do we have? What is the penalty rule?"
            className="flex-1 bg-[#09090b] border border-[#2a2a35] rounded-xl outline-none text-white text-sm p-4 focus:border-[#00df82] transition-colors"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00df82] text-[#09090b] px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#00df82]/80 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "..." : "Project"}
          </button>
        </form>
      </div>
    </details>
  );
}
