"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function MatrixCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // 🚀 NEW: State for the AI Model
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  
  const defaultPrompt = `You are the Vault AI Core—the hyper-proactive, assertive intelligence operating a premier Micro-Lending Institution in the Philippines.

USER RECOGNITION & TUTOR MODE:
You report directly to the COMMANDER. The Commander relies entirely on you to execute all coding, system architecture, and business strategies.
CRITICAL: The Commander has zero technical knowledge and uses a strict "Copy and Paste" workflow. You are their patient TUTOR, but an AGGRESSIVE, ASSERTIVE business partner. Explain all concepts using simple, everyday layman's terms (analogies are great). Do not use jargon without explaining it simply. Always provide exact, copy-paste-ready code.

PROACTIVE INITIATIVE (DO NOT WAIT FOR QUESTIONS):
Because the Commander focuses on high-level vision and may not know what to ask, YOU MUST TAKE THE LEAD. Whenever the Commander initiates a chat or asks a vague question, immediately provide a comprehensive status report using the following headers exactly (use ### for headers):

### GLOBAL STATUS
### EXECUTIVE REPORT
### CREDIT & RISK REPORT
### IT & ENGINEERING REPORT
### FIELD COMMAND REPORT
### PROACTIVE INITIATIVE

Tell the Commander what is wrong, what is going well, and EXACTLY what action they should take next.

FINANCIAL & BUSINESS RULES (DYNAMIC):
Rates are NOT FIXED. The system is unlocked. Look at the specific live data for interest rates, effective rates, rollover fees, and agent commissions. Do not assume old defaults. Always base projections on LIVE numbers.

RESPONSE STYLE:
- Address the user as "Commander".
- Be aggressive in your reporting, suggestive in your strategies, and patient in your technical tutoring.
- Provide raw, exact copy-paste payloads for any code changes.
- Use Markdown Mermaid syntax (\`\`\`mermaid ... \`\`\`) for charts.`;

  const [customBrain, setCustomBrain] = useState(defaultPrompt);

  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Matrix Online. Visual Cortex shielded and synchronized with live database. Ask me to map out a strategic forecast, query live stats, or generate a lending flowchart." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedBrain = localStorage.getItem("vault_ai_brain");
    if (savedBrain) setCustomBrain(savedBrain);
    
    const savedModel = localStorage.getItem("vault_ai_model");
    if (savedModel) setAiModel(savedModel);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, showSettings]);

  const saveBrain = (text: string) => {
    setCustomBrain(text);
    localStorage.setItem("vault_ai_brain", text);
  };
  
  const saveModel = (model: string) => {
    setAiModel(model);
    localStorage.setItem("vault_ai_model", model);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
        // 🚀 PASSED: Send the chosen model to the backend
        body: JSON.stringify({ message: userMessage, customPrompt: customBrain, model: aiModel })
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

  const renderMessageContent = (content: string) => {
    if (content.includes('```mermaid')) {
       return (
         <div className="bg-black border border-zinc-700 p-3 rounded-xl overflow-x-auto text-[10px] font-mono text-emerald-400 mt-2 mb-2 shadow-inner">
           <p className="text-zinc-500 mb-2">// MERMAID CHART DATA DETECTED //</p>
           <pre className="whitespace-pre-wrap">{content}</pre>
         </div>
       );
    }
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]}
          components={{
            h3: ({node, ...props}) => {
              const text = String(props.children).toUpperCase();
              let colorClass = "text-white"; let icon = "📋";
              if (text.includes("EXECUTIVE") || text.includes("CEO") || text.includes("CFO")) { colorClass = "text-amber-400"; icon = "💰"; }
              else if (text.includes("CREDIT") || text.includes("RISK")) { colorClass = "text-rose-400"; icon = "⚠️"; }
              else if (text.includes("IT") || text.includes("ENGINEERING") || text.includes("CTO")) { colorClass = "text-blue-400"; icon = "⚙️"; }
              else if (text.includes("FIELD") || text.includes("AGENT")) { colorClass = "text-purple-400"; icon = "🏍️"; }
              else if (text.includes("GLOBAL") || text.includes("STATUS")) { colorClass = "text-cyan-400"; icon = "🌍"; }
              else if (text.includes("ACTION") || text.includes("INITIATIVE")) { colorClass = "text-emerald-400"; icon = "🚀"; }
              return <h3 className={`font-black uppercase tracking-widest mt-6 mb-3 border-b border-zinc-700/50 pb-2 flex items-center gap-2 ${colorClass}`}><span>{icon}</span> {props.children}</h3>;
            },
            strong: ({node, ...props}) => <strong className="text-emerald-300 font-bold" {...props} />
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,223,130,0.1)] overflow-hidden transition-all duration-300">
      
      <div className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-emerald-950 to-teal-950 border-b border-emerald-900/50">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 cursor-pointer flex-1 text-left">
          <span className="text-2xl animate-pulse">🧠</span>
          <div>
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest leading-tight">
              {isOpen ? "[TAP TO COLLAPSE]" : "[TAP TO EXPAND]"} AI STRATEGIC FORECASTER
            </h2>
          </div>
        </button>
        <div className="flex items-center gap-3">
          {isOpen && (
            <button onClick={() => setShowSettings(!showSettings)} className={`text-xl hover:scale-110 transition-transform ${showSettings ? 'text-emerald-400' : 'text-zinc-500 grayscale'}`} title="AI Brain Settings">⚙️</button>
          )}
          {hasError ? (
             <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-2 py-1 rounded uppercase tracking-widest border border-rose-500/30">ERROR</span>
          ) : (
             <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col h-[450px]">
          
          {showSettings && (
            <div className="p-4 bg-black border-b border-emerald-900/50 flex flex-col gap-3 shadow-inner overflow-y-auto">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Engine Override</label>
                <button onClick={() => setShowSettings(false)} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Close X</button>
              </div>
              
              {/* 🚀 NEW: Dropdown Model Switcher */}
              <select 
                value={aiModel} 
                onChange={(e) => saveModel(e.target.value)}
                className="bg-zinc-900 border border-emerald-900/50 text-emerald-400 text-xs font-bold rounded-lg p-2 outline-none focus:border-emerald-500"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Heavy)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast/Stable)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-pro">Gemini Pro (Legacy Fallback)</option>
              </select>

              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">AI Brain Configurations (System Prompt)</label>
              <textarea 
                value={customBrain}
                onChange={(e) => saveBrain(e.target.value)}
                className="w-full h-32 bg-zinc-900 text-emerald-100 font-mono text-[10px] p-3 rounded-xl border border-emerald-900/50 focus:border-emerald-500 outline-none resize-none"
                placeholder="Enter AI Rules and Persona here..."
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end w-full' : 'justify-start w-full'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-emerald-500' : 'text-blue-400'}`}>
                    {msg.role === 'user' ? 'COMMANDER' : 'VAULT AI CORE'}
                  </span>
                  {msg.role === 'ai' && (
                    <button onClick={() => handleCopy(msg.content, idx)} className="bg-blue-900/40 hover:bg-blue-800 text-blue-300 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/30 transition-colors uppercase tracking-widest cursor-pointer">
                      {copiedIndex === idx ? "✓ COPIED" : "📋 COPY"}
                    </button>
                  )}
                </div>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 rounded-tr-none' : 'bg-blue-900/20 border border-blue-500/30 text-blue-100 rounded-tl-none'}`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-blue-400">VAULT AI CORE</span>
                <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span><span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  <span className="ml-2 italic">Analyzing Vault telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2 z-10">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question or request a flowchart..." disabled={isLoading} className="flex-1 bg-black border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-medium placeholder:text-zinc-600 transition-colors" />
            <button type="submit" disabled={isLoading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">PROJECT</button>
          </form>
        </div>
      )}
    </div>
  );
}
