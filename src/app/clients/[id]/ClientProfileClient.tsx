function CentralizedChat({ clientId, messages }: { clientId: number, messages: Message[] }) {
  const [chatInput, setChatInput] = useState(""); 
  const [isSending, setIsSending] = useState(false); 
  const [isDrafting, setIsDrafting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // 🚀 DEFAULT TO THE CLEAN, STABLE 1.5 FLASH
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  
  const handleCopy = (id: number, text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (error) {} finally { textArea.remove(); }
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!chatInput.trim() || isSending) return; setIsSending(true);
    const res = await sendChatMessage(clientId, chatInput);
    if (res.success) { setChatInput(""); } else { alert(res.error); }
    setIsSending(false);
  };

  const handleAIDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch("/api/chat-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, model: aiModel })
      });
      const data = await res.json();
      if (data.reply) { setChatInput(data.reply); } 
      else { alert(data.error || "Matrix Error: AI Drafting Failed."); }
    } catch (e) { alert("Network Error during AI Sync."); } 
    finally { setIsDrafting(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[550px] shadow-xl overflow-hidden mt-6">
      <div className="p-4 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">💬 Centralized Comm-Link</h2>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">SECURE CHANNEL</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0c0c0e]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2"><span className="text-4xl">📭</span><p className="text-sm">No messages yet.</p></div>
        ) : (
          messages.map((msg) => {
            const sender = msg.sender || "CLIENT";
            const isAdmin = sender === "ADMIN"; 
            const isClient = sender === "CLIENT"; 
            const isAgent = sender.startsWith("AGENT"); 
            const isSystem = sender === "VAULT SYSTEM";
            
            return (
              <div key={msg.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'} group`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isAdmin ? 'text-blue-400' : isAgent ? 'text-amber-400' : isSystem ? 'text-purple-400' : 'text-emerald-400'}`}>
                  {sender} • {formatDateTime(msg.createdAt?.toString())}
                </span>
                
                <div className="flex items-end gap-2 max-w-[85%]">
                  {!isClient && (
                    <button onClick={() => handleCopy(msg.id, msg.text)} className={`p-2 rounded-full transition-all flex-shrink-0 ${copiedId === msg.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 md:opacity-100'}`} title="Copy to Clipboard">
                      {copiedId === msg.id ? '✓' : '📋'}
                    </button>
                  )}
                  
                  <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-md ${isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : isAgent ? 'bg-amber-600 text-white rounded-tr-none' : isSystem ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100 rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700'}`}>
                    {msg.text}
                  </div>
                  
                  {isClient && (
                    <button onClick={() => handleCopy(msg.id, msg.text)} className={`p-2 rounded-full transition-all flex-shrink-0 ${copiedId === msg.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 md:opacity-100'}`} title="Copy to Clipboard">
                      {copiedId === msg.id ? '✓' : '📋'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 bg-zinc-800 border-t border-zinc-700 flex flex-col gap-2">
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." disabled={isSending || isDrafting} className="flex-1 bg-black border border-zinc-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
          <button type="submit" disabled={isSending || isDrafting || !chatInput.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isSending ? '...' : 'SEND'}</button>
        </form>
        <div className="flex justify-between items-center px-1">
          
          {/* 🚀 THE CLEAN OMNI-SWITCHER */}
          <select 
            value={aiModel} 
            onChange={(e) => setAiModel(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] rounded p-1 outline-none focus:border-emerald-500"
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (Light)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Heavy)</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Experimental)</option>
          </select>

          <button type="button" onClick={handleAIDraft} disabled={isDrafting} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 uppercase tracking-widest disabled:opacity-50">
            {isDrafting ? "⏳ Syncing with Matrix..." : "✨ Auto-Draft Response via Copilot"}
          </button>
        </div>
      </div>
    </div>
  );
}
