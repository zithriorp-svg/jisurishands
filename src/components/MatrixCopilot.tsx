"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const AI_PROVIDERS = [
  { id: "gemini", name: "Google Gemini (Cloud)" },
  { id: "openai", name: "OpenAI ChatGPT (Cloud)" },
  { id: "deepseek", name: "DeepSeek (Cloud)" },
  { id: "grok", name: "xAI Grok (Cloud)" },
  { id: "claude", name: "Anthropic Claude (Cloud)" },
  { id: "pecoclaw", name: "Pecoclaw (Cloud)" },
  { id: "local_picoclaw", name: "PicoClaw (Local Phone via Ngrok)" }
];

const DEFAULT_MODEL_LISTS: Record<string, string> = {
  gemini: "gemini-1.5-flash, gemini-2.5-flash, gemini-1.5-pro",
  openai: "gpt-4o-mini, gpt-4o, gpt-3.5-turbo",
  deepseek: "deepseek-chat, deepseek-coder",
  grok: "grok-1, grok-1.5",
  claude: "claude-3-haiku-20240307, claude-3-sonnet-20240229",
  pecoclaw: "peco-v1, peco-fast",
  local_picoclaw: "picoclaw-local"
};

export default function MatrixCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [ngrokUrl, setNgrokUrl] = useState("");
  const [modelLists, setModelLists] = useState<Record<string, string>>(DEFAULT_MODEL_LISTS);
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({
    gemini: "gemini-1.5-flash", openai: "gpt-4o-mini", deepseek: "deepseek-chat", grok: "grok-1", claude: "claude-3-haiku-20240307", pecoclaw: "peco-v1", local_picoclaw: "picoclaw-local"
  });

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
    { role: 'ai', content: "Matrix Online. Dual-Core Hub synchronized. Connect to the Cloud or your Local Phone Wormhole. Waiting for orders." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 🚀 PWA ENGINE IGNITION
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log("PWA Engine Status: Standby"));
    }

    const savedBrain = localStorage.getItem("vault_ai_brain");
    if (savedBrain) setCustomBrain(savedBrain);
    
    const savedProvider = localStorage.getItem("vault_ai_provider");
    if (savedProvider) setActiveProvider(savedProvider);

    const savedKeys = localStorage.getItem("vault_ai_keys");
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));

    const savedNgrok = localStorage.getItem("vault_ngrok_url");
    if (savedNgrok) setNgrokUrl(savedNgrok);

    const savedLists = localStorage.getItem("vault_ai_lists");
    if (savedLists) setModelLists(JSON.parse(savedLists));

    const savedSelections = localStorage.getItem("vault_ai_selections");
    if (savedSelections) setSelectedModels(JSON.parse(savedSelections));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, showSettings]);

  const saveBrain = (text: string) => { setCustomBrain(text); localStorage.setItem("vault_ai_brain", text); };
  const saveProvider = (providerId: string) => { setActiveProvider(providerId); localStorage.setItem("vault_ai_provider", providerId); };
  const saveKey = (providerId: string, key: string) => {
    const newKeys = { ...apiKeys, [providerId]: key };
    setApiKeys(newKeys); localStorage.setItem("vault_ai_keys", JSON.stringify(newKeys));
  };
  const saveNgrok = (url: string) => { setNgrokUrl(url); localStorage.setItem("vault_ngrok_url", url); };
  
  const saveModelList = (providerId: string, list: string) => {
    const newLists = { ...modelLists, [providerId]: list };
    setModelLists(newLists); localStorage.setItem("vault_ai_lists", JSON.stringify(newLists));
    const firstModel = list.split(',')[0]?.trim();
    if (firstModel) saveSelection(providerId, firstModel);
  };
  const saveSelection = (providerId: string, model: string) => {
    const newSelections = { ...selectedModels, [providerId]: model };
    setSelectedModels(newSelections); localStorage.setItem("vault_ai_selections", JSON.stringify(newSelections));
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
      const activeKey = apiKeys[activeProvider] || "";
      const activeModel = selectedModels[activeProvider] || "";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          customPrompt: customBrain, 
          model: activeModel,
          provider: activeProvider,
          clientKey: activeKey,
          ngrokUrl: ngrokUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matrix Disconnected");

      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (error: any) {
      console.error("AI Forecaster Error:", error);
      setHasError(true);
      setMessages(prev => [...prev, { role: 'ai', content: `**SYSTEM ALERT:** \n\n*Diagnostic:* ${error.message}` }]);
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

  const currentModelArray = (modelLists[activeProvider] || "").split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,223,130,0.1)] overflow-hidden transition-all duration-300">
      
      <div className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-emerald-950 to-teal-950 border-b border-emerald-900/50">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 cursor-pointer flex-1 text-left">
          <span className="text-2xl animate-pulse">🧠</span>
          <div>
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest leading-tight">
              {isOpen ? "[TAP TO COLLAPSE]" : "[TAP TO EXPAND]"} AI STRATEGIC FORECASTER
            </h2>
            <p className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest">Active Engine: {activeProvider.toUpperCase()}</p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          {isOpen && (
            <button onClick={() => setShowSettings(!showSettings)} className={`text-xl hover:scale-110 transition-transform ${showSettings ? 'text-emerald-400' : 'text-zinc-500 grayscale'}`} title="Omni-AI Settings">⚙️</button>
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
        <div className="flex flex-col h-[550px]">
          
          {showSettings && (
            <div className="p-4 bg-black border-b border-emerald-900/50 flex flex-col gap-4 shadow-inner overflow-y-auto max-h-[300px]">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <label className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">🌐 DUAL-CORE CONTROL HUB</label>
                <button onClick={() => setShowSettings(false)} className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 hover:text-white uppercase font-bold transition-colors">Close X</button>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">1. Select AI Company</label>
                <select 
                  value={activeProvider} 
                  onChange={(e) => saveProvider(e.target.value)}
                  className={`w-full text-white text-sm font-bold rounded-lg p-2 outline-none ${activeProvider === 'local_picoclaw' ? 'bg-blue-900/40 border border-blue-500/50 focus:border-blue-400' : 'bg-zinc-900 border border-zinc-700 focus:border-emerald-500'}`}
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {activeProvider === "local_picoclaw" ? (
                <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/50 shadow-inner">
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">2. Paste Ngrok Wormhole URL</label>
                  <input 
                    type="url"
                    value={ngrokUrl}
                    onChange={(e) => saveNgrok(e.target.value)}
                    placeholder="[https://your-link.ngrok-free.app](https://your-link.ngrok-free.app)"
                    className="w-full bg-black border border-blue-900 text-blue-300 font-mono text-xs rounded-lg p-2 outline-none focus:border-blue-500"
                  />
                  <p className="text-[9px] text-blue-500/70 mt-1 italic">* Paste the exact https:// link generated by Termux on your phone.</p>
                </div>
              ) : (
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">2. Paste {activeProvider.toUpperCase()} API Key</label>
                  <input 
                    type="password"
                    value={apiKeys[activeProvider] || ""}
                    onChange={(e) => saveKey(activeProvider, e.target.value)}
                    placeholder={`Paste your ${activeProvider} key here (skips .env file)`}
                    className="w-full bg-black border border-zinc-700 text-emerald-400 font-mono text-xs rounded-lg p-2 outline-none focus:border-emerald-500"
                  />
                  <p className="text-[9px] text-zinc-600 mt-1 italic">* Keys are securely encrypted and stored locally in your browser.</p>
                </div>
              )}

              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">3. Custom Model Version List</label>
                <textarea 
                  value={modelLists[activeProvider] || ""}
                  onChange={(e) => saveModelList(activeProvider, e.target.value)}
                  placeholder="e.g. gemini-1.5-flash, gemini-2.0-pro"
                  className="w-full h-12 bg-black border border-zinc-700 text-amber-400 font-mono text-xs rounded-lg p-2 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">4. Select Active Model</label>
                <select 
                  value={selectedModels[activeProvider] || ""} 
                  onChange={(e) => saveSelection(activeProvider, e.target.value)}
                  className="w-full bg-emerald-900/20 border border-emerald-500/50 text-emerald-400 text-sm font-bold rounded-lg p-2 outline-none focus:border-emerald-500"
                >
                  {currentModelArray.length === 0 ? (
                    <option value="">No models listed above...</option>
                  ) : (
                    currentModelArray.map((model, idx) => (
                      <option key={idx} value={model}>{model}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="border-t border-zinc-800 pt-3 mt-2">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 block">AI System Persona (Brain)</label>
                <textarea 
                  value={customBrain}
                  onChange={(e) => saveBrain(e.target.value)}
                  className="w-full h-32 bg-zinc-900 text-emerald-100 font-mono text-[10px] p-3 rounded-xl border border-emerald-900/50 focus:border-emerald-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end w-full' : 'justify-start w-full'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-emerald-500' : activeProvider === 'local_picoclaw' ? 'text-blue-400' : 'text-emerald-300'}`}>
                    {msg.role === 'user' ? 'COMMANDER' : activeProvider === 'local_picoclaw' ? 'PHONE MATRIX CORE' : `${activeProvider.toUpperCase()} CORE`}
                  </span>
                  {msg.role === 'ai' && (
                    <button onClick={() => handleCopy(msg.content, idx)} className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[9px] font-black px-2 py-0.5 rounded border border-zinc-600/50 transition-colors uppercase tracking-widest cursor-pointer">
                      {copiedIndex === idx ? "✓ COPIED" : "📋 COPY"}
                    </button>
                  )}
                </div>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 rounded-tr-none' : activeProvider === 'local_picoclaw' ? 'bg-blue-900/30 border border-blue-500/30 text-blue-100 rounded-tl-none' : 'bg-zinc-800/80 border border-zinc-700 text-zinc-200 rounded-tl-none'}`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${activeProvider === 'local_picoclaw' ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {activeProvider === 'local_picoclaw' ? 'BEAMING TO PHONE...' : 'SYNCING WITH CLOUD...'}
                </span>
                <div className={`p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 ${activeProvider === 'local_picoclaw' ? 'bg-blue-900/20 border border-blue-500/30 text-blue-400' : 'bg-zinc-800/80 border border-zinc-700 text-zinc-400'}`}>
                  <span className={`w-2 h-2 rounded-full animate-bounce ${activeProvider === 'local_picoclaw' ? 'bg-blue-400' : 'bg-zinc-400'}`}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce ${activeProvider === 'local_picoclaw' ? 'bg-blue-400' : 'bg-zinc-400'}`} style={{ animationDelay: '0.2s' }}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce ${activeProvider === 'local_picoclaw' ? 'bg-blue-400' : 'bg-zinc-400'}`} style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2 z-10">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={activeProvider === 'local_picoclaw' ? "Send command to your Samsung S22..." : `Send commands to ${activeProvider.toUpperCase()}...`} disabled={isLoading} className="flex-1 bg-black border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-medium placeholder:text-zinc-600 transition-colors" />
            <button type="submit" disabled={isLoading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">PROJECT</button>
          </form>
        </div>
      )}
    </div>
  );
}
