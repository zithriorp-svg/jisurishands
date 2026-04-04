"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendPortalChatMessage } from "./actions";

interface MessageData {
  id: number;
  sender: string;
  text: string;
  createdAt: string;
}

interface InstallmentData {
  period: number;
  dueDate: string;
  expectedAmount: number;
  principal: number;
  interest: number;
  penaltyFee: number;
  status: string;
  paymentDate: string | null;
  amountPaid: number;
}

interface PaymentData {
  id: number;
  amount: number;
  paymentDate: string;
  periodNumber: number;
  paymentType: string;
}

interface LoanData {
  id: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  termType: string;
  totalRepayment: number;
  totalPaid: number;
  remainingBalance: number;
  startDate: string;
  endDate: string;
  status: string;
  installments: InstallmentData[];
  payments: PaymentData[];
}

interface DashboardData {
  clientName: string;
  clientId: number;
  totalBorrowed: number;
  totalPaid: number;
  remainingBalance: number;
  totalPenalties: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  nextDuePeriod: number;
  activeLoanId: number;
  trustScore: number;
  trustTier: string;
  trustColor: string;
  trustBg: string;
  paymentStats: {
    totalInstallments: number;
    paidOnTime: number;
    paidLate: number;
    pending: number;
    overdue: number;
  };
  loans: LoanData[];
  messages: MessageData[];
}

const formatCurrency = (value: number) => {
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-PH', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getCountdown = (dueDate: string | null): string => {
  if (!dueDate) return "No upcoming payment";
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} OVERDUE`;
  if (diffDays === 0) return "DUE TODAY";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
};

const getCountdownColor = (dueDate: string | null): string => {
  if (!dueDate) return "text-zinc-400";
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "text-rose-400";
  if (diffDays === 0) return "text-amber-400";
  if (diffDays <= 3) return "text-yellow-400";
  return "text-emerald-400";
};

export default function ClientDashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history' | 'chat'>('overview');
  
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data.messages, activeTab]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/client-auth/logout', { method: 'POST' });
    router.push('/portal');
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    setIsSending(true);
    const res = await sendPortalChatMessage(chatInput);
    if (res.success) setChatInput("");
    else alert(res.error);
    setIsSending(false);
  };

  const isOverdue = data.paymentStats.overdue > 0;

  return (
    <div className="min-h-screen bg-zinc-900 pb-20 font-sans">
      <div className={`p-6 transition-colors ${isOverdue ? 'bg-gradient-to-r from-red-900 to-rose-900' : 'bg-gradient-to-r from-blue-900 to-purple-900'}`}>
        <div className="max-w-4xl mx-auto flex justify-between items-start">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{data.clientName}</h1>
            <p className="text-sm text-blue-200 mt-1 font-mono">Client ID: {data.clientId}</p>
          </div>
          <button onClick={handleLogout} disabled={loggingOut} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded transition-colors uppercase">
            {loggingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4 -mt-4 relative z-10">
        
        {isOverdue && (
          <div className="bg-rose-500/20 border border-rose-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
            <h2 className="text-lg font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>⚠️</span> CONTRACT COMPLIANCE WARNING
            </h2>
            <p className="text-white text-sm mb-3">
              You have <strong className="text-rose-400 font-black">{data.paymentStats.overdue} OVERDUE</strong> payment(s). A total of <strong className="text-rose-400 font-black">{formatCurrency(data.totalPenalties)}</strong> in penalty fees has been applied to your account.
            </p>
            <div className="bg-black/40 p-4 rounded border border-rose-500/30 text-xs text-rose-200/80 leading-relaxed italic">
              "Sa kaso ng hindi pagbabayad, ang NANGUTANG ay sumasang-ayon na maaaring isama ang kanyang pangalan sa lista ng delinquent borrowers, at ang Pledged Collateral ay maaaring hatakin (seized) ayon sa pinirmahang Master Contract."
            </div>
          </div>
        )}

        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Account Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Borrowed</p>
              <p className="text-lg font-bold text-white">{formatCurrency(data.totalBorrowed)}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Paid</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(data.totalPaid)}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Remaining</p>
              <p className="text-lg font-bold text-blue-400">{formatCurrency(data.remainingBalance)}</p>
            </div>
            <div className={`bg-zinc-900 rounded-xl p-3 text-center border ${data.totalPenalties > 0 ? 'border-rose-500/50' : 'border-zinc-800'}`}>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Penalty Fees</p>
              <p className={`text-lg font-bold ${data.totalPenalties > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{formatCurrency(data.totalPenalties)}</p>
            </div>
          </div>

          <div className={`rounded-xl p-4 border border-transparent ${data.trustBg} ${isOverdue ? 'border-rose-500/50' : ''}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Borrower Status</p>
                <p className={`text-xl font-black ${data.trustColor}`}>{data.trustTier}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Trust Score</p>
                <p className={`text-3xl font-black ${data.trustColor}`}>{data.trustScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {data.nextDueDate && (
          <div className={`border rounded-2xl p-6 shadow-xl transition-all ${isOverdue ? 'bg-rose-950/40 border-rose-500/50' : 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isOverdue ? 'text-rose-400' : 'text-blue-400'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
              Next Payment Action Required
            </h2>
            <div className="text-center mb-6">
              <p className="text-xs text-zinc-400 uppercase font-bold mb-1">Amount Due (Includes Penalties)</p>
              <p className="text-5xl font-black text-white mb-2">{formatCurrency(data.nextDueAmount)}</p>
              <p className={`text-xl font-black uppercase tracking-widest ${getCountdownColor(data.nextDueDate)}`}>
                {getCountdown(data.nextDueDate)}
              </p>
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
          {(['overview', 'schedule', 'history', 'chat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 min-w-[100px] rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab
                  ? tab === 'chat' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {tab === 'chat' ? `Comm-Link (${data.messages.length})` : tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Payment Progress</h3>
              <div className="mb-6">
                <div className="flex justify-between text-xs text-zinc-400 font-bold mb-2 uppercase">
                  <span>Paid Progress</span>
                  <span>{Math.round((data.totalPaid / data.totalBorrowed) * 100)}%</span>
                </div>
                <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${(data.totalPaid / data.totalBorrowed) * 100}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Total</p>
                  <p className="text-lg font-black text-white">{data.paymentStats.totalInstallments}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 border border-emerald-500/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-400">On Time</p>
                  <p className="text-lg font-black text-emerald-400">{data.paymentStats.paidOnTime}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 border border-amber-500/20">
                  <p className="text-[10px] uppercase font-bold text-amber-400">Late</p>
                  <p className="text-lg font-black text-amber-400">{data.paymentStats.paidLate}</p>
                </div>
                <div className={`bg-zinc-900 rounded-xl p-3 border ${data.paymentStats.overdue > 0 ? 'border-rose-500/50' : 'border-zinc-800'}`}>
                  <p className={`text-[10px] uppercase font-bold ${data.paymentStats.overdue > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>Overdue</p>
                  <p className={`text-lg font-black ${data.paymentStats.overdue > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{data.paymentStats.overdue}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Official Amortization Matrix</h3>
            <div className="space-y-2">
              {data.loans.flatMap(loan => 
                loan.installments.map(inst => {
                  const isLateOrOverdue = inst.status === 'LATE' || (inst.status === 'PENDING' && new Date(inst.dueDate) < new Date());
                  return (
                    <div key={`${loan.id}-${inst.period}`} className={`flex flex-col p-4 rounded-xl border ${
                      inst.status === 'PAID' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                      isLateOrOverdue ? 'bg-rose-500/10 border-rose-500/30' : 'bg-zinc-900 border-zinc-800'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                            inst.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 
                            isLateOrOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>{inst.period}</span>
                          <div>
                            <p className="text-sm font-black text-white">{formatCurrency(inst.expectedAmount)}</p>
                            <p className="text-xs font-bold text-zinc-500 uppercase">{formatDate(inst.dueDate)}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${
                          inst.status === 'PAID' ? 'text-emerald-400 bg-emerald-500/10' : 
                          isLateOrOverdue ? 'text-rose-400 bg-rose-500/10 animate-pulse' : 'text-zinc-400 bg-zinc-800'
                        }`}>
                          {inst.status === 'PAID' ? '✓ PAID' : isLateOrOverdue ? '⚠️ OVERDUE' : 'PENDING'}
                        </span>
                      </div>
                      {inst.penaltyFee > 0 && (
                        <div className="ml-11 text-xs font-bold text-rose-400 mt-1 uppercase tracking-wider">
                          + Penalty Applied: {formatCurrency(inst.penaltyFee)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Official Payment Ledgers</h3>
            <div className="space-y-3">
              {data.loans.flatMap(loan => loan.payments).length === 0 ? (
                <p className="text-center text-zinc-500 font-bold uppercase py-6">No payments recorded</p>
              ) : (
                data.loans.flatMap(loan => loan.payments).map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          {formatDate(payment.paymentDate)} • INST #{payment.periodNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {payment.paymentType || 'FULL'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col h-[500px] shadow-xl overflow-hidden">
            <div className="p-4 bg-emerald-950/30 border-b border-emerald-900/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Secure Comm-Link
                </h2>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">Connect with Admin & Agent</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
              {data.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <span className="text-4xl mb-2">📡</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Channel Open</p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase">Awaiting Transmission...</p>
                </div>
              ) : (
                data.messages.map((msg) => {
                  const isMe = msg.sender === "CLIENT";
                  const isAdmin = msg.sender === "ADMIN";
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isMe ? 'text-emerald-400' : isAdmin ? 'text-blue-400' : 'text-amber-400'}`}>
                        {isMe ? 'YOU' : msg.sender} • {formatDateTime(msg.createdAt)}
                      </span>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 
                        isAdmin ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tl-none' : 
                        'bg-amber-600/20 border border-amber-500/30 text-amber-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..." 
                disabled={isSending}
                className="flex-1 bg-black border border-zinc-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium"
              />
              <button type="submit" disabled={isSending || !chatInput.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50">
                {isSending ? '...' : 'SEND'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

