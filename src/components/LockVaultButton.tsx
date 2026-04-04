"use client";

import { useState } from "react";

export default function LockVaultButton() {
  const [isLocking, setIsLocking] = useState(false);

  const handleLock = async () => {
    if (!confirm("Lock the vault and logout?")) return;
    
    setIsLocking(true);
    try {
      // Trigger the Global Cookie Incinerator
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Force a hard refresh of the browser to drop all Next.js cached states
      window.location.href = "/login";
    } catch (error) {
      console.error("Error locking vault:", error);
      setIsLocking(false);
    }
  };

  return (
    <button
      onClick={handleLock}
      disabled={isLocking}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-lg
        ${isLocking 
          ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
          : 'bg-rose-950/30 text-rose-400 border-rose-900/50 hover:bg-rose-900 hover:text-white'
        }`}
    >
      <span className="text-lg">{isLocking ? '⏳' : '🔒'}</span>
      {isLocking ? 'LOCKING...' : 'LOCK VAULT'}
    </button>
  );
}
