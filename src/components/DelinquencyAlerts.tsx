"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // 🚀 INJECTED: Next.js Router
import { Phone } from "lucide-react";
import { sendFBNotification, generateOverdueNotice, generateDueTodayNotice, generatePaymentReminder } from "@/utils/notifications";

interface AlertBase {
  id: number;
  loanId: number;
  clientId: number;
  period: number;
  dueDate: Date | string;
  expectedAmount: number;
  clientName: string;
  firstName: string;
  phone: string;
  agentName: string | null;
  penaltyFee: number;
  fbProfileUrl: string | null;
  messengerId: string | null;
  loan: any; 
}

interface OverdueAlert extends AlertBase { daysLate: number; }
interface DueTodayAlert extends AlertBase {}
interface UpcomingAlert extends AlertBase {}

interface DelinquencyAlertsProps {
  overdue: OverdueAlert[];
  dueToday: DueTodayAlert[];
  upcoming: UpcomingAlert[];
}

const formatCurrency = (value: number): string => "₱" + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (date: Date | string): string => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '63' + cleaned.substring(1);
  if (cleaned.length === 10 && !cleaned.startsWith('63')) cleaned = '63' + cleaned;
  return cleaned;
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '14px', height: '14px', minWidth: '14px' }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '14px', height: '14px', minWidth: '14px' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/></svg>
);

function CommunicationButtons({ alert, type }: { alert: any, type: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' }) {
  const [copied, setCopied] = useState(false);
  const [sendingComm, setSendingComm] = useState(false);
  const formattedPhone = formatPhone(alert.phone);
  
  let message = "";
  if (type === 'OVERDUE') {
    const baseAmount = alert.expectedAmount;
    const discountAmount = baseAmount * 0.04;
    const totalAmount = baseAmount + discountAmount + (alert.penaltyFee || 0);
    message = generateOverdueNotice({
      clientName: alert.clientName, periodNumber: alert.period, daysLate: alert.daysLate || 0,
      baseAmount, discountAmount, penaltyAmount: alert.penaltyFee || 0, totalAmount, dueDate: alert.dueDate, loan: alert.loan
    });
  } else if (type === 'DUE_TODAY') {
    message = generateDueTodayNotice({ clientName: alert.clientName, amount: alert.expectedAmount, periodNumber: alert.period, loan: alert.loan });
  } else {
    message = generatePaymentReminder({ clientName: alert.clientName, amount: alert.expectedAmount, periodNumber: alert.period, dueDate: alert.dueDate, loan: alert.loan });
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  const smsUrl = `sms:${formattedPhone}?body=${encodedMessage}`;

  const handleFBClick = () => {
    sendFBNotification({
      message, clientName: alert.clientName, fbProfileUrl: alert.fbProfileUrl, messengerId: alert.messengerId,
      onCopy: () => { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });
  };

  const handleCommLinkClick = async () => {
    if (sendingComm) return;
    setSendingComm(true);
    try {
      const res = await fetch('/api/send-comm-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: alert.clientId, message })
      });
      const data = await res.json();
      if (data.success) { alert("Alert dropped successfully into Client Comm-Link!"); } 
      else { alert("Failed to send: " + data.error); }
    } catch (e) { alert("Network error."); } 
    finally { setSendingComm(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button onClick={handleCommLinkClick} disabled={sendingComm} className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 text-[10px] sm:text-xs font-bold rounded transition-all whitespace-nowrap disabled:opacity-50" title="Send directly to Comm-Link">
        💬 {sendingComm ? '...' : 'COMM'}
      </button>

      <button onClick={handleFBClick} className={`flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-bold rounded transition-all whitespace-nowrap ${copied ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' : 'bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400'}`} title="FB Notify">
        <MessengerIcon className="w-3 h-3" /> {copied ? '✓' : 'FB'}
      </button>

      {alert.phone ? (
        <>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold rounded transition-all whitespace-nowrap" title="WhatsApp">
            <WhatsAppIcon className="w-3 h-3" /> WA
          </a>
          <a href={smsUrl} className="flex items-center gap-1 px-2 py-1 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 text-zinc-400 text-[10px] sm:text-xs font-bold rounded transition-all whitespace-nowrap" title="SMS">
            <Phone className="w-3 h-3" style={{ width: '14px', height: '14px', minWidth: '14px' }} /> SMS
          </a>
        </>
      ) : (
        <span className="text-[10px] text-zinc-500 italic px-1">No phone</span>
      )}
    </div>
  );
}

function PenaltyButton({ installmentId, loanId, clientName, onPenaltyApplied }: { installmentId: number; loanId: number; clientName: string; onPenaltyApplied: () => void; }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApplyPenalty = async () => {
    if (applying || applied) return;
    if (!confirm(`REVOKE the 4% Good Payer Discount for ${clientName}?\n\nThis action cannot be undone.`)) return;

    setApplying(true);
    try {
      const res = await fetch('/api/enforce-penalty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installmentId, loanId }) });
      const data = await res.json();
      if (data.success) { 
        setApplied(true); 
        onPenaltyApplied(); // 🚀 This will trigger the router refresh!
      } else { 
        alert(data.error || 'Failed to apply penalty'); 
      }
    } catch (e) { alert('Network error'); } finally { setApplying(false); }
  };

  if (applied) return <span className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px] sm:text-xs font-bold rounded whitespace-nowrap cursor-not-allowed">✓ Penalty Applied</span>;

  return (
    <button onClick={handleApplyPenalty} disabled={applying} className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 text-[10px] sm:text-xs font-bold rounded transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" title="Apply Penalty">
      {applying ? <span className="animate-spin w-3 h-3 border border-red-400 border-t-transparent rounded-full"></span> : <><span>⚠️</span> Apply Penalty</>}
    </button>
  );
}

export default function DelinquencyAlerts({ overdue, dueToday, upcoming }: DelinquencyAlertsProps) {
  const router = useRouter(); // 🚀 INJECTED: Next.js Router for instant refresh
  const totalAlerts = overdue.length + dueToday.length + upcoming.length;

  const [showOverdue, setShowOverdue] = useState(true);
  const [showDueToday, setShowDueToday] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);

  // 🚀 UPGRADED: Forces the page to silently reload data without a harsh flash
  const handlePenaltyApplied = () => {
    router.refresh(); 
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><span className="text-lg">🎯</span> Proactive HUD</h2>
        {totalAlerts > 0 && <span className="bg-zinc-700 text-zinc-300 text-xs px-3 py-1 rounded-full font-bold">{totalAlerts} total</span>}
      </div>

      <div className="space-y-6">
        {/* 🔴 CRITICAL - OVERDUE */}
        <div>
          <div className="flex items-center justify-between mb-3 cursor-pointer bg-zinc-800/30 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors" onClick={() => setShowOverdue(!showOverdue)}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Critical — Overdue</h3>
              {overdue.length > 0 && <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">{overdue.length}</span>}
            </div>
            <span className="text-zinc-500 text-xs font-bold px-2">{showOverdue ? '▼ HIDE' : '▶ SHOW'}</span>
          </div>

          {showOverdue && (
            overdue.length === 0 ? (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3"><p className="text-emerald-400 text-sm font-medium flex items-center gap-2"><span>✓</span> No overdue accounts</p></div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {overdue.map((item) => (
                  <div key={`overdue-${item.id}`} className="flex flex-col p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group gap-3">
                    <div className="flex items-start justify-between">
                      <Link href={`/payments?clientId=${item.clientId}`} className="flex-1">
                        <p className="font-bold text-rose-400 break-words">{item.clientName}</p>
                        <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">TXN-{item.loanId.toString().padStart(4, '0')} · Period {item.period}</p>
                      </Link>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-bold text-white text-sm sm:text-base">{formatCurrency(item.expectedAmount)}</p>
                        <p className="text-[10px] sm:text-xs text-rose-400 font-medium">{item.daysLate} {item.daysLate === 1 ? 'day' : 'days'} late</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/10">
                      <CommunicationButtons alert={item} type="OVERDUE" />
                      <PenaltyButton installmentId={item.id} loanId={item.loanId} clientName={item.clientName} onPenaltyApplied={handlePenaltyApplied} />
                      <Link href={`/payments?clientId=${item.clientId}`} className="ml-auto bg-rose-500 hover:bg-rose-400 text-white text-[10px] sm:text-xs px-4 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap">Process</Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* 🟡 DUE TODAY */}
        <div>
          <div className="flex items-center justify-between mb-3 cursor-pointer bg-zinc-800/30 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors" onClick={() => setShowDueToday(!showDueToday)}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Due Today</h3>
              {dueToday.length > 0 && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-bold">{dueToday.length}</span>}
            </div>
            <span className="text-zinc-500 text-xs font-bold px-2">{showDueToday ? '▼ HIDE' : '▶ SHOW'}</span>
          </div>

          {showDueToday && (
            dueToday.length === 0 ? (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3"><p className="text-emerald-400 text-sm font-medium flex items-center gap-2"><span>✓</span> No payments due today</p></div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {dueToday.map((item) => (
                  <div key={`duetoday-${item.id}`} className="flex flex-col p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-all group gap-3">
                    <div className="flex items-start justify-between">
                      <Link href={`/payments?clientId=${item.clientId}`} className="flex-1">
                        <p className="font-bold text-yellow-400 break-words">{item.clientName}</p>
                        <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">TXN-{item.loanId.toString().padStart(4, '0')} · Period {item.period}</p>
                      </Link>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-bold text-white text-sm sm:text-base">{formatCurrency(item.expectedAmount)}</p>
                        <p className="text-[10px] sm:text-xs text-yellow-400 font-medium">Due Today</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-yellow-500/10">
                      <CommunicationButtons alert={item} type="DUE_TODAY" />
                      <Link href={`/payments?clientId=${item.clientId}`} className="ml-auto bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] sm:text-xs px-4 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap">Process</Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* 🔵 UPCOMING RADAR */}
        <div>
          <div className="flex items-center justify-between mb-3 cursor-pointer bg-zinc-800/30 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors" onClick={() => setShowUpcoming(!showUpcoming)}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Upcoming Radar</h3>
              {upcoming.length > 0 && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">{upcoming.length}</span>}
            </div>
            <span className="text-zinc-500 text-xs font-bold px-2">{showUpcoming ? '▼ HIDE' : '▶ SHOW'}</span>
          </div>

          {showUpcoming && (
            upcoming.length === 0 ? (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3"><p className="text-emerald-400 text-sm font-medium flex items-center gap-2"><span>✓</span> No upcoming payments this week</p></div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {upcoming.map((item) => (
                  <div key={`upcoming-${item.id}`} className="flex flex-col p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group gap-3">
                    <div className="flex items-start justify-between">
                      <Link href={`/payments?clientId=${item.clientId}`} className="flex-1">
                        <p className="font-bold text-blue-400 break-words">{item.clientName}</p>
                        <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">TXN-{item.loanId.toString().padStart(4, '0')} · Period {item.period}</p>
                      </Link>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-bold text-white text-sm sm:text-base">{formatCurrency(item.expectedAmount)}</p>
                        <p className="text-[10px] sm:text-xs text-blue-400">Due {formatDate(item.dueDate)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-500/10">
                      <CommunicationButtons alert={item} type="UPCOMING" />
                      <Link href={`/payments?clientId=${item.clientId}`} className="ml-auto bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white text-[10px] sm:text-xs px-4 py-1.5 border border-blue-500/30 rounded-lg font-bold transition-colors whitespace-nowrap">Process</Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
