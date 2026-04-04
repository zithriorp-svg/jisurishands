import { getActivePortfolio } from "@/lib/portfolio";
import Link from "next/link";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppHeader() {
  const activePortfolio = await getActivePortfolio();

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
          FinTech<span className="text-blue-400">Vault</span>
        </Link>
        
        <div className="flex items-center gap-3">
          {/* Active Portfolio Badge */}
          <Link 
            href="/settings" 
            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors"
          >
            <span className="text-yellow-500 text-xs font-bold">FY:</span>
            <span className="text-yellow-400 text-sm font-medium truncate max-w-[150px]">
              {activePortfolio}
            </span>
          </Link>
          
          <Link 
            href="/settings" 
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
