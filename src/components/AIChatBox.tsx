"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export default function AIChatBox({ stats }: { stats: any }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("Matrix Online. I am your Chief Risk Officer, Financial Strategist, and System Architect. How can we optimize operations today?");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, stats })
      });
      const data = await res.json();
      setResponse(data.reply || data.error);
    } catch (error) {
      setResponse("Critical Error: Connection lost to the AI core.");
    }
    setIsLoading(false);
    setInput("");
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1b2e] to-[#1c1c21] rounded-2xl p-5 shadow-lg border border-[#2d2b4a]">
      <h2 className="text-white font-bold mb-2 flex items-center gap-2">
        <Sparkles className="text-yellow-400" size={18} />
        AI Co-Pilot Mentor
      </h2>

      <div className="bg-[#0f0f13] border border-[#2a2a35] rounded-lg p-4 mb-4 h-48 overflow-y-auto">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{response}</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Consult the AI..."
          className="flex-1 bg-[#0f0f13] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center min-w-[70px]"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Send"}
        </button>
      </div>
    </div>
  );
}
