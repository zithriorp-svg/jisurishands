// src/utils/notifications.ts

interface OverdueNoticeData {
  clientName: string;
  periodNumber: number;
  daysLate: number;
  baseAmount: number;
  discountAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  dueDate: Date | string;
  loan: any;
}

interface DueNoticeData {
  clientName: string;
  amount: number;
  periodNumber: number;
  loan: any;
}

interface ReminderNoticeData {
  clientName: string;
  amount: number;
  periodNumber: number;
  dueDate: Date | string;
  loan: any;
}

// Tactical Number Formatting (PHP Standard)
const formatMoney = (amount: number) => "P" + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

// ==========================================
// OPERATIONAL MESSAGES
// ==========================================

export const generateOverdueNotice = (data: OverdueNoticeData): string => {
  const txnId = data.loan?.id?.toString().padStart(4, '0') || '0000';
  return (
`🚨 REPAYMENT NOTICE (OVERDUE)

Hello ${data.firstName || data.clientName},

Your payment for Transaction TXN-${txnId} is now ${data.daysLate} days past due.

TXN-${txnId}: ${formatMoney(data.baseAmount)}
Penalty Applied: ${formatMoney(data.penaltyAmount)} (4% Discount Revoked)
----------------------------
Total Amount Due: ${formatMoney(data.totalAmount)}

Please settle this immediately. Further delays will result in additional contract enforcement measures.

- Lending Hands (Pilmico Branch)`
  );
};

export const generateDueTodayNotice = (data: DueNoticeData): string => {
  const txnId = data.loan?.id?.toString().padStart(4, '0') || '0000';
  return (
`📅 REPAYMENT NOTICE (DUE TODAY)

Hello ${data.firstName || data.clientName},

This is a reminder that your payment for Transaction TXN-${txnId} is due today.

Installment Period: ${data.periodNumber}
Amount Due: ${formatMoney(data.amount)}

Please maintain your Prime Borrower status and your 4% Good Payer Discount by paying on time.

- Lending Hands (Pilmico Branch)`
  );
};

export const generatePaymentReminder = (data: ReminderNoticeData): string => {
  const txnId = data.loan?.id?.toString().padStart(4, '0') || '0000';
  return (
`🔔 PAYMENT REMINDER

Hello ${data.firstName || data.clientName},

This is an early reminder that your payment for Transaction TXN-${txnId} is due in the next few days.

Original Due Date: ${formatDate(data.dueDate)}
Installment Period: ${data.periodNumber}
Amount Due: ${formatMoney(data.amount)}

Thank you for your consistency!

- Lending Hands (Pilmico Branch)`
  );
};

// ==========================================
// FB / MESSENGER ENGINE
// ==========================================

interface SendFBNotificationProps {
  message: string;
  clientName: string;
  fbProfileUrl: string | null;
  messengerId: string | null;
  onCopy?: () => void;
}

export const sendFBNotification = ({
  message,
  clientName,
  fbProfileUrl,
  messengerId,
  onCopy
}: SendFBNotificationProps) => {
  
  // 1. Copy the heavy text block to the clipboard for manual pasting
  navigator.clipboard.writeText(message).then(() => {
    if (onCopy) onCopy();
    
    let fbUrl = "";

    // 2. Open the direct Messenger chat to the client
    if (messengerId) {
      fbUrl = `https://m.me/${messengerId}`;
    } else if (fbProfileUrl) {
      fbUrl = fbProfileUrl;
    } else {
      fbUrl = `https://www.facebook.com/messages`;
    }
    
    window.open(fbUrl, "_blank");
  });
};
