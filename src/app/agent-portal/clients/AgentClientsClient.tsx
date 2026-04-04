"use client";

import { useState } from "react";
import Link from "next/link";

interface InstallmentForLedger {
  period: number;
  dueDate: Date | string;
  expectedAmount: number;
  principal: number;
  interest: number;
  penaltyFee: number;
  status: string;
  paymentDate: Date | string | null;
  amountPaid: number;
}

interface LoanForLedger {
  id: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  totalRepayment: number;
  totalPaid: number;
  remainingBalance: number;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  goodPayerDiscountRevoked: boolean;
  installments: InstallmentForLedger[];
}

interface ClientLoan {
  id: number;
  principal: number;
  interestRate: number;
  termDuration: number;
  totalRepayment: number;
  status: string;
  goodPayerDiscountRevoked: boolean;
  startDate: Date | string;
  endDate: Date | string;
  installments: Array<{
    period: number;
    dueDate: Date | string;
    expectedAmount: number;
    principal: number;
    interest: number;
    penaltyFee: number;
    status: string;
    paymentDate: Date | string | null;
    amountPaid: number;
  }>;
  payments: Array<{ amount: number }>;
}

interface ClientData {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  fbProfileUrl: string | null;
  messengerId: string | null;
  loans: ClientLoan[];
}

interface AgentClientsClientProps {
  clients: ClientData[];
  agentName: string;
  agentId: number;
}

const formatCurrency = (value: number) => {
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const formatCurrencyPrecise = (value: number) => {
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * 🚀 UPGRADED: Self-contained Status Generator
 */
const generateAccountStatusUpdate = (
  clientName: string,
  loan: LoanForLedger
): string => {
  const txnId = loan.id.toString().padStart(4, '0');
  return `ACCOUNT STATUS UPDATE 📊\n\nHello ${clientName},\n\nThis is a routine update regarding your active account with us.\n\nTXN-${txnId} SUMMARY:\nTotal Loan: ${formatCurrencyPrecise(loan.totalRepayment)}\nTotal Paid: ${formatCurrencyPrecise(loan.totalPaid)}\nRemaining Balance: ${formatCurrencyPrecise(loan.remainingBalance)}\n\nThank you for your continued partnership!\n\n- FinTech Vault`;
};

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/>
  </svg>
);

function FBNotifyButton({
  clientName,
  loan,
  fbProfileUrl,
  messengerId,
}: {
  clientName: string;
  loan: LoanForLedger;
  fbProfileUrl: string | null;
  messengerId: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    const message = generateAccountStatusUpdate(clientName, loan);

    navigator.clipboard.writeText(message);

    let profileUrl: string;
    if (fbProfileUrl) {
      if (fbProfileUrl.startsWith('http://') || fbProfileUrl.startsWith('https://')) {
        profileUrl = fbProfileUrl;
      } else {
        profileUrl = `https://${fbProfileUrl}`;
      }
    } else if (messengerId) {
      if (messengerId.startsWith('http://') || messengerId.startsWith('https://')) {
        profileUrl = messengerId;
      } else {
        profileUrl = `https://${messengerId}`;
      }
    } else {
      profileUrl = `https://www.facebook.com/search/people/?q=${encodeURIComponent(clientName)}`;
    }

    window.open(profileUrl, '_blank');

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
        copied
          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
          : 'bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400'
      }`}
      title="Copy status update & open Facebook profile"
    >
      <MessengerIcon className="w-3.5 h-3.5" />
      {copied ? '✓ Copied!' : '💬 FB Notify'}
    </button>
  );
}

export default function AgentClientsClient({ clients, agentName, agentId }: AgentClientsClientProps) {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        <div className="flex justify-between items-start pt-4">
          <div>
            <Link href="/agent-portal" className="text-sm text-zinc-500 hover:text-zinc-400 mb-2 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">My Clients</h1>
            <p className="text-sm text-zinc-500">
              Agent: <span className="text-emerald-400">{agentName}</span>
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl min-w-[100px]">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total</span>
            <p className="text-2xl font-bold text-white">{clients.length}</p>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">🔒</span>
            <span className="text-xs text-emerald-400">Data Partitioned • Only your assigned clients</span>
          </div>
          <span className="text-xs text-zinc-500">Agent ID: {agentId}</span>
        </div>

        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
              <p className="text-zinc-400 font-medium">No clients assigned to you yet.</p>
            </div>
          ) : (
            clients.map((client) => {
              const totalBorrowed = client.loans.reduce((sum, l) => sum + Number(l.principal), 0);
              const totalRepaid = client.loans.reduce((sum, l) => 
                sum + l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0
              );
              const activeLoans = client.loans.filter(l => l.status === 'ACTIVE').length;
              
              return (
                <div key={client.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400 font-bold text-xl">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">{client.firstName} {client.lastName}</h2>
                        <p className="text-xs text-zinc-500">ID: {client.id} • {client.phone || 'No phone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeLoans > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                          {activeLoans} Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Borrowed</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(totalBorrowed)}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Repaid</p>
                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalRepaid)}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-zinc-500">Balance</p>
                      <p className="text-sm font-bold text-amber-400">{formatCurrency(totalBorrowed - totalRepaid)}</p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-xs text-zinc-500 uppercase mb-3">Loans & Actions</p>
                    <div className="space-y-3">
                      {client.loans.map(loan => {
                        const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                        const totalPrincipalPaid = loan.installments
                          .filter(i => i.status === 'PAID')
                          .reduce((sum, i) => sum + Number(i.principal || 0), 0);
                        const totalInterestPaid = loan.installments
                          .filter(i => i.status === 'PAID')
                          .reduce((sum, i) => sum + Number(i.interest || 0), 0);
                        const remaining = Number(loan.totalRepayment) - totalPaid;

                        const loanForLedger: LoanForLedger = {
                          id: loan.id,
                          principal: Number(loan.principal),
                          interestRate: Number(loan.interestRate),
                          termDuration: loan.termDuration,
                          totalRepayment: Number(loan.totalRepayment),
                          totalPaid: totalPrincipalPaid + totalInterestPaid,
                          remainingBalance: Number(loan.totalRepayment) - (totalPrincipalPaid + totalInterestPaid),
                          startDate: loan.startDate,
                          endDate: loan.endDate,
                          status: loan.status,
                          goodPayerDiscountRevoked: loan.goodPayerDiscountRevoked,
                          installments: loan.installments
                        };
                        
                        return (
                          <div key={loan.id} className="bg-zinc-800 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-zinc-400">Loan #{loan.id}</span>
                              <span className={`text-xs font-bold ${
                                loan.status === 'PAID' ? 'text-emerald-400' : 'text-blue-400'
                              }`}>
                                {loan.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs mb-3">
                              <span className="text-zinc-500">Principal: <span className="text-white">{formatCurrency(Number(loan.principal))}</span></span>
                              <span className="text-zinc-500">Remaining: <span className="text-amber-400">{formatCurrency(remaining)}</span></span>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                              <Link
                                href={`/clients/${client.id}`}
                                className="flex-1 text-center bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                              >
                                📄 View Dossier
                              </Link>
                              {loan.status === 'ACTIVE' && (
                                <FBNotifyButton
                                  clientName={`${client.firstName} ${client.lastName}`}
                                  loan={loanForLedger}
                                  fbProfileUrl={client.fbProfileUrl}
                                  messengerId={client.messengerId}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
