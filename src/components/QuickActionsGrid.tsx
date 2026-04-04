"use client";

import Link from "next/link";
import ApplyLinksTrigger from "./ApplyLinksTrigger";

interface Portfolio {
  id: number;
  name: string;
}

interface QuickActionsGridProps {
  isAdmin: boolean;
  portfolios: Portfolio[];
}

export default function QuickActionsGrid({ isAdmin, portfolios }: QuickActionsGridProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* RBAC: Admin-only actions */}
        {isAdmin && (
          <>
            <Link 
              href="/analytics" 
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 rounded-xl border border-blue-500/30 transition-all font-bold text-white tracking-wide cursor-pointer"
            >
              <span className="text-2xl mb-1">📈</span>
              <span>Analytics</span>
            </Link>
            <Link 
              href="/agents" 
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 rounded-xl border border-emerald-500/30 transition-all font-bold text-white tracking-wide cursor-pointer"
            >
              <span className="text-2xl mb-1">🤝</span>
              <span>Agents</span>
            </Link>
          </>
        )}
        
        {/* Actions visible to ALL users */}
        <Link 
          href="/apply" 
          className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all font-bold text-white tracking-wide cursor-pointer"
        >
          <span className="text-2xl mb-1">⊕</span>
          <span>New Application</span>
        </Link>
        
        {/* Copy Apply Links - Dedicated client trigger component */}
        <ApplyLinksTrigger portfolios={portfolios} />
        
        <Link 
          href="/payments" 
          className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all font-bold text-white tracking-wide cursor-pointer"
        >
          <span className="text-2xl mb-1">💵</span>
          <span>Process Payment</span>
        </Link>
        <Link 
          href="/clients" 
          className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all font-bold text-white tracking-wide cursor-pointer"
        >
          <span className="text-2xl mb-1">👥</span>
          <span>Clients</span>
        </Link>
        
        {/* RBAC: Treasury - ADMIN ONLY */}
        {isAdmin && (
          <Link 
            href="/treasury" 
            className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all font-bold text-white tracking-wide cursor-pointer"
          >
            <span className="text-2xl mb-1">🏦</span>
            <span>Treasury</span>
          </Link>
        )}
      </div>
    </div>
  );
}
