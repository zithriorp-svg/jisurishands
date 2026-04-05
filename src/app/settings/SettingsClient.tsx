"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { switchPortfolioAction, initializeNewYearAction, deletePortfolioAction } from "./actions";

interface SettingsClientProps {
  activePortfolio: string;
  portfolioList: string[];
}

export default function SettingsClient({ activePortfolio, portfolioList }: SettingsClientProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(activePortfolio);
  const [newYearName, setNewYearName] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSwitchPortfolio = async () => {
    if (selectedPortfolio === activePortfolio) {
      setMessage("Already viewing this portfolio");
      return;
    }
    setSwitchLoading(true); setMessage("");
    const result = await switchPortfolioAction(selectedPortfolio);
    if (result.success) { window.location.reload(); } 
    else { setMessage(result.error || "Failed to switch portfolio"); }
    setSwitchLoading(false);
  };

  const handleInitializeNewYear = async () => {
    if (!newYearName.trim()) { setMessage("Please enter a portfolio name"); return; }
    setInitLoading(true); setMessage("");
    const result = await initializeNewYearAction(newYearName.trim());
    if (result.success) { window.location.reload(); } 
    else { setMessage(result.error || "Failed to initialize new year"); }
    setInitLoading(false);
  };

  const handleDeletePortfolio = async () => {
    // ☢️ NUCLEAR SAFETY LOCK REMOVED: No more blocks for Main Portfolio!
    const confirm1 = confirm(`WARNING: You are about to permanently delete "${selectedPortfolio}".\n\nThis will erase ALL data inside it. Proceed?`);
    if (!confirm1) return;
    const confirm2 = confirm(`FINAL WARNING: This action CANNOT BE UNDONE. Are you absolutely sure?`);
    if (!confirm2) return;

    setDeleteLoading(true); setMessage("Initiating destruction sequence...");
    const result = await deletePortfolioAction(selectedPortfolio);
    if (result.success) { window.location.reload(); } 
    else { setMessage(result.error || "Destruction failed."); }
    setDeleteLoading(false);
  };

  const handleDownloadBackup = (format: 'csv' | 'json') => {
    if (!selectedPortfolio) return;
    window.open(`/api/backup?portfolio=${encodeURIComponent(selectedPortfolio)}&format=${format}`, '_blank');
    setMessage(`📥 Downloading ${format.toUpperCase()} Backup for "${selectedPortfolio}"...`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    setMessage("Reading backup file...");

    try {
      const text = await file.text();
      let backupData;
      
      try {
         backupData = JSON.parse(text);
      } catch (parseError) {
         setMessage("Error: The uploaded file is corrupted or not a valid JSON.");
         setRestoreLoading(false);
         if (fileInputRef.current) fileInputRef.current.value = '';
         return;
      }

      const originalName = backupData.portfolio || "Restored";
      const suggestedName = `${originalName} (Backup ${new Date().toLocaleDateString().replace(/\//g, '-')})`;
      
      const newPortfolioName = window.prompt(
        "CREATE NEW PORTFOLIO FROM BACKUP\n\nEnter a name for the new portfolio. Your existing data will NOT be touched:", 
        suggestedName
      );

      if (!newPortfolioName) {
        setMessage("Restore cancelled.");
        setRestoreLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setMessage(`Building new portfolio: "${newPortfolioName}"...`);

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPortfolio: newPortfolioName.trim(), backupData })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unknown Server Error");
      }

      await switchPortfolioAction(newPortfolioName.trim());
      setMessage(`✅ Success! Switched to new portfolio "${newPortfolioName.trim()}"! Rebooting...`);
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (err: any) {
       console.error("Network/Upload Error:", err);
       setMessage(`Matrix Error: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setRestoreLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20 font-sans">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-zinc-500">Manage fiscal years and portfolios</p>
        </div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Currently Viewing</p>
          <p className="text-xl font-bold text-yellow-400">{activePortfolio}</p>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-lg">
          <span className="text-yellow-400 text-sm font-bold">FY Active</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Active Fiscal Year</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Select Portfolio</label>
            <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-blue-500">
              {portfolioList.map((portfolio) => (
                <option key={portfolio} value={portfolio}>{portfolio} {portfolio === activePortfolio ? "(Current)" : ""}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSwitchPortfolio} disabled={switchLoading || selectedPortfolio === activePortfolio} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
            {switchLoading ? "Switching..." : "Switch Year"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Portfolio Data Management</h2>
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed mb-4">Manage the data for the portfolio selected above (<span className="text-zinc-300 font-bold">{selectedPortfolio}</span>).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={() => handleDownloadBackup('csv')} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
              📄 Download CSV
            </button>
            <button onClick={() => handleDownloadBackup('json')} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
              📦 Download JSON
            </button>
          </div>
          
          <button onClick={() => fileInputRef.current?.click()} disabled={restoreLoading} className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 mt-2">
            {restoreLoading ? "⏳ Reading..." : "📤 Upload JSON to New Portfolio"}
          </button>
          
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <div className="pt-4 border-t border-zinc-800 mt-4">
            {/* ☢️ THE LOCK IS GONE: The 'disabled' prop ONLY checks if it's currently loading, no more Main Portfolio check! */}
            <button onClick={handleDeletePortfolio} disabled={deleteLoading} className="w-full bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 mt-2">
              {deleteLoading ? "Destroying..." : "🗑️ Delete Portfolio"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Start Fresh Fiscal Year</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">New Fiscal Year Name</label>
            <input type="text" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="e.g., 2027 New Day..." className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={handleInitializeNewYear} disabled={initLoading || !newYearName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
            {initLoading ? "Initializing..." : "Initialize New Year"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold ${message.includes("✅") ? "bg-emerald-500/20 text-emerald-400" : message.includes("💥") || message.includes("Error") || message.includes("cancelled") ? "bg-rose-500/20 text-rose-400" : "bg-zinc-800 text-white"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
