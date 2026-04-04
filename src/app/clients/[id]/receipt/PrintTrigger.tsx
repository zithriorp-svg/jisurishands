'use client';

export default function PrintTrigger() {
  return (
    <div className="print:hidden bg-zinc-900 p-4 text-center border-b border-zinc-700 sticky top-0 z-50">
      <button 
        onClick={() => window.print()} 
        className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-6 rounded font-bold shadow-lg transition-colors cursor-pointer"
      >
        🖨️ Print / Download PDF Receipt
      </button>
      <p className="text-zinc-400 text-xs mt-2">Set printer destination to &quot;Save as PDF&quot;.</p>
    </div>
  );
}
