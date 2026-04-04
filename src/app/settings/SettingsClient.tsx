"use client";

import { useState } from "react";
import Link from "next/link";
import { switchPortfolioAction, initializeNewYearAction } from "./actions";

interface SettingsClientProps {
  activePortfolio: string;
  portfolioList: string[];
}

export default function SettingsClient({ activePortfolio, portfolioList }: SettingsClientProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(activePortfolio);
  const [newYearName, setNewYearName] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSwitchPortfolio = async () => {
    if (selectedPortfolio === activePortfolio) {
      setMessage("Already viewing this portfolio");
      return;
    }

    setSwitchLoading(true);
    setMessage("");

    const result = await switchPortfolioAction(selectedPortfolio);
    
    if (result.success) {
      setMessage(`✅ Switched to "${selectedPortfolio}"`);
      // Reload to apply changes
      window.location.reload();
    } else {
      setMessage(result.error || "Failed to switch portfolio");
    }

    setSwitchLoading(false);
  };

  const handleInitializeNewYear = async () => {
    if (!newYearName.trim()) {
      setMessage("Please enter a portfolio name");
      return;
    }

    setInitLoading(true);
    setMessage("");

    const result = await initializeNewYearAction(newYearName.trim());
    
    if (result.success) {
      setMessage(`✅ Created and switched to "${newYearName.trim()}"`);
      // Reload to apply changes
      window.location.reload();
    } else {
      setMessage(result.error || "Failed to initialize new year");
    }

    setInitLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-zinc-500">Manage fiscal years and portfolios</p>
        </div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      {/* Current Portfolio Badge */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Currently Viewing</p>
          <p className="text-xl font-bold text-yellow-400">{activePortfolio}</p>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-lg">
          <span className="text-yellow-400 text-sm font-bold">FY Active</span>
        </div>
      </div>

      {/* Card 1: Switch Portfolio */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Active Fiscal Year</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Select Portfolio</label>
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-blue-500"
            >
              {portfolioList.map((portfolio) => (
                <option key={portfolio} value={portfolio}>
                  {portfolio} {portfolio === activePortfolio ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwitchPortfolio}
            disabled={switchLoading || selectedPortfolio === activePortfolio}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {switchLoading ? "Switching..." : "Switch Year"}
          </button>
        </div>
      </div>

      {/* Card 2: Initialize New Year */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Start Fresh Fiscal Year</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">New Fiscal Year Name</label>
            <input
              type="text"
              value={newYearName}
              onChange={(e) => setNewYearName(e.target.value)}
              placeholder="e.g., 2027 New Day, Branch Expansion..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-xs text-zinc-500">
            This will create a new empty portfolio. All new records will be saved to this portfolio.
          </p>

          <button
            onClick={handleInitializeNewYear}
            disabled={initLoading || !newYearName.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initLoading ? "Initializing..." : "Initialize New Year"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.includes("✅") ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {message}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">How Portfolios Work</h2>
        <ul className="text-sm text-zinc-500 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">•</span>
            Each portfolio isolates all data (clients, loans, expenses, transactions)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">•</span>
            Switching portfolios filters the entire application
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">•</span>
            New records are automatically saved to the active portfolio
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">•</span>
            Perfect for fiscal years, branches, or separate business units
          </li>
        </ul>
      </div>
    </div>
  );
}
