"use client";

import { useState } from "react";

interface ExpenseFormProps {
  categories: string[];
}

export default function ExpenseForm({ categories }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/expenses", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage("Expense logged successfully!");
        (document.getElementById("expense-form") as HTMLFormElement)?.reset();
        window.location.reload();
      } else {
        setMessage(data.error || "Failed to log expense");
      }
    } catch (err) {
      setMessage("Network error.");
    }
    setLoading(false);
  }

  return (
    <form id="expense-form" action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input type="number" name="amount" step="0.01" required placeholder="Amount (PHP)" className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500" />
        <select name="category" required className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500">
          <option value="">Select category</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <input type="text" name="description" placeholder="Description (optional)" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500" />
      <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50">
        {loading ? "Processing..." : "Log Expense"}
      </button>
      {message && <p className={`text-sm text-center p-2 rounded ${message.includes("success") ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>{message}</p>}
    </form>
  );
}
