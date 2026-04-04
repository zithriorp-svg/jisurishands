"use client";

// Contract Print Button - Client Component with floating action bar
export function ContractPrintButton({ clientId }: { clientId: number }) {
  return (
    <div className="print:hidden fixed top-0 left-0 right-0 bg-zinc-900 text-white p-4 flex justify-between items-center shadow-lg z-50">
      <p className="text-sm text-zinc-300">
        Review the contract below. Click <span className="text-emerald-400 font-medium">Print</span> and change the destination to <span className="text-emerald-400 font-medium">&quot;Save as PDF&quot;</span>.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          🖨️ Print / Save as PDF
        </button>
        <a
          href={`/clients/${clientId}`}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-bold transition-colors"
        >
          ← Back to Client
        </a>
      </div>
    </div>
  );
}
