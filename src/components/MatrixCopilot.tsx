"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function MatrixCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Matrix Online. Visual Cortex shielded and synchronized with live database. Ask me to map out a strategic forecast, query live stats, or generate a lending flowchart." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setHasError(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Matrix Disconnected");

      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (error: any) {
      console.error("AI Forecaster Error:", error);
      setHasError(true);
      setMessages(prev => [...prev, { role: 'ai', content: `**ERROR:** Connection to AI Core severed. \n\n*Diagnostic:* ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🛡️ Safe Render Function for AI Content
  const renderMessageContent = (content: string) => {
    // If it contains mermaid, wrap it safely so it doesn't crash React if Mermaid isn't fully loaded
    if (content.includes('```mermaid')) {
       return (
         <div className="bg-black border border-zinc-700 p-3 rounded-xl overflow-x-auto text-[10px] font-mono text-emerald-400 mt-2 mb-2">
           <p className="text-zinc-500 mb-2">// MERMAID CHART DATA DETECTED //</p>
           <pre className="whitespace-pre-wrap">{content}</pre>
         </div>
       );
    }

    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,223,130,0.1)] overflow-hidden transition-all duration-300">
      
      {/* Header Bar - Click to Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-emerald-950 to-teal-950 border-b border-emerald-900/50 cursor-pointer hover:from-emerald-900/80 hover:to-teal-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">🧠</span>
          <div className="text-left">
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest leading-tight">
              {isOpen ? "[TAP TO COLLAPSE]" : "[TAP TO EXPAND]"} AI STRATEGIC FORECASTER
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasError ? (
             <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-2 py-1 rounded uppercase tracking-widest border border-rose-500/30">ERROR</span>
          ) : (
             <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </span>
          )}
          <svg className={`w-5 h-5 text-emerald-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="flex flex-col h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${msg.role === 'user' ? 'text-emerald-500' : 'text-blue-400'}`}>
                  {msg.role === 'user' ? 'COMMANDER' : 'VAULT AI CORE'}
                </span>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 rounded-tr-none' 
                    : 'bg-blue-900/20 border border-blue-500/30 text-blue-100 rounded-tl-none'
                }`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-blue-400">VAULT AI CORE</span>
                <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  <span className="ml-2 italic">Analyzing Vault telemetry and generating strategic models...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Generate a flowchart mapping out default risks..." 
              disabled={isLoading}
              className="flex-1 bg-black border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-medium placeholder:text-zinc-600 transition-colors"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              PROJECT
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
