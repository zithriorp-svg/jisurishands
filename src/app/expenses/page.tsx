import { prisma } from "@/lib/db";
import Link from "next/link";
import ExpenseForm from "./ExpenseForm";
import { getActivePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Operations", "Payroll", "Technology", "Marketing", "Utilities", "Rent", "Supplies", "Travel", "Legal", "Other"];

export default async function ExpensesPage() {
  const portfolio = await getActivePortfolio();
  
  const expenses = await prisma.expense.findMany({ 
    where: { portfolio },
    orderBy: { date: 'desc' }, 
    take: 50 
  });
  
  const categoryTotals: Record<string, number> = {};
  let totalExpenses = 0;
  expenses.forEach(exp => {
    const amt = Number(exp.amount);
    totalExpenses += amt;
    if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
    categoryTotals[exp.category] += amt;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Operating Expenses</h1>
          <p className="text-sm text-zinc-500">Portfolio: <span className="text-yellow-400">{portfolio}</span></p>
        </div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-400">₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Transactions</p>
          <p className="text-2xl font-bold text-white">{expenses.length}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Log New Expense</h2>
        <ExpenseForm categories={CATEGORIES} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Expense Breakdown</h2>
        <div className="space-y-2">
          {Object.entries(categoryTotals).sort(([,a], [,b]) => b - a).map(([cat, total]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span className="text-zinc-400">{cat}</span>
              <span className="text-white font-bold">₱{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          {Object.keys(categoryTotals).length === 0 && (
            <p className="text-zinc-500 text-center py-4">No expenses recorded yet</p>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Recent Expenses</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {expenses.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">No expenses recorded yet.</p>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                <div>
                  <p className="font-bold text-white">{expense.category}</p>
                  <p className="text-xs text-zinc-500">{expense.description || 'No description'}</p>
                </div>
                <p className="font-bold text-red-400">-₱{Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
