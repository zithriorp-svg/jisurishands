"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CollectionNote {
  id: number;
  note: string;
  agentId: number | null;
  promisedDate: string | null;
  createdAt: string;
}

interface CollectionLogProps {
  installmentId: number;
  penaltyFee: number;
  status: string;
  expectedAmount?: number; 
  principalAmount?: number; 
  loanId?: number; 
  onPenaltyApplied?: () => void;
}

export default function CollectionLog({ 
  installmentId, 
  penaltyFee, 
  status,
  loanId,
  onPenaltyApplied 
}: CollectionLogProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<CollectionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [applyingPenalty, setApplyingPenalty] = useState(false);
  const [penaltyApplied, setPenaltyApplied] = useState(false);
  const [currentPenalty, setCurrentPenalty] = useState(penaltyFee);

  useEffect(() => {
    setCurrentPenalty(penaltyFee);
    // Only lock the button if there is an actual mathematical penalty
    setPenaltyApplied(penaltyFee > 0);

    const controller = new AbortController();
    fetch(`/api/collection?installmentId=${installmentId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.notes) setNotes(data.notes);
        setLoading(false);
      })
      .catch(e => {
        if (e.name !== 'AbortError') setLoading(false);
      });

    return () => controller.abort();
  }, [installmentId, penaltyFee]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'note', installmentId, note: noteText.trim() })
      });
      const data = await res.json();
      if (data.success && data.note) {
        setNotes(prev => [data.note, ...prev]);
        setNoteText("");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleApplyPenalty = async () => {
    if (applyingPenalty || penaltyApplied) return;
    if (!loanId) {
      alert("Error: Loan ID missing. Cannot apply penalty from this view.");
      return;
    }
    if (!confirm("REVOKE the 4% Good Payer Discount?\n\nThis action cannot be undone.")) return;

    setApplyingPenalty(true);
    try {
      const res = await fetch('/api/enforce-penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, loanId })
      });

      const data = await res.json();
      if (data.success) {
        setPenaltyApplied(true); 
        setCurrentPenalty(prev => prev + 40.00); 
        
        setNotes(prev => [{
          id: Date.now(),
          note: `🚨 DISCOUNT REVOKED: 4% Good Payer Discount (₱40.00) forfeited. \nTotal penalties: ₱${(currentPenalty + 40.00).toFixed(2)}`,
          agentId: null, promisedDate: null, createdAt: new Date().toISOString()
        }, ...prev]);

        if (onPenaltyApplied) onPenaltyApplied();
        router.refresh();
      } else {
        alert(data.error || "Failed to apply penalty.");
      }
    } catch (e) {
      alert("Network error while applying penalty.");
    }
    setApplyingPenalty(false);
  };

  if (status === 'PAID') return null;

  return (
    <div className="mt-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Collection Log</p>
        {currentPenalty > 0 && (
          <span className="text-xs text-rose-400 font-bold">Penalties: ₱{currentPenalty.toFixed(2)}</span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex flex-1 gap-2">
          <input
            type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder="Log a note..."
            className="flex-1 min-w-[120px] bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded-lg outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={handleAddNote} disabled={saving || !noteText.trim()}
            className="px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "📝 Log"}
          </button>
        </div>
        <button
          onClick={handleApplyPenalty} disabled={applyingPenalty || penaltyApplied}
          className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            penaltyApplied 
            ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed" 
            : "bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
          }`}
        >
          {applyingPenalty ? "..." : penaltyApplied ? "✓ Discount Revoked" : "⚠️ Revoke Discount"}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : notes.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {notes.slice(0, 6).map((note) => {
            const isPenalty = note.note.includes("DISCOUNT REVOKED");
            return (
              <div key={note.id} className={`text-xs p-2 rounded-lg border ${isPenalty ? 'bg-rose-950/20 border-rose-900/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
                <p className={isPenalty ? 'text-rose-300 font-medium' : 'text-zinc-300'}>{note.note}</p>
                <p className={`${isPenalty ? 'text-rose-500/70' : 'text-zinc-600'} mt-1 flex items-center gap-1`}>
                  {isPenalty && <span>⚠️</span>} {formatDate(note.createdAt)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No collection notes yet</p>
      )}
    </div>
  );
}


