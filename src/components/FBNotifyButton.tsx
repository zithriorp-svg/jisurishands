"use client";

import { useState } from "react";
import { sendFBNotification } from "@/utils/notifications";

interface FBNotifyButtonProps {
  // Message content
  message: string;
  
  // Client info
  clientName: string;
  fbProfileUrl?: string | null;
  messengerId?: string | null;
  
  // Button styling
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  
  // Callbacks
  onSent?: () => void;
}

/**
 * Reusable FB Notify Button Component
 * 
 * Copies message to clipboard and opens Facebook Messenger
 */
export default function FBNotifyButton({
  message,
  clientName,
  fbProfileUrl,
  messengerId,
  variant = 'secondary',
  size = 'sm',
  label = '💬 FB Notify',
  onSent
}: FBNotifyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const handleClick = () => {
    if (sending) return;
    
    setSending(true);
    
    const result = sendFBNotification({
      message,
      clientName,
      fbProfileUrl,
      messengerId,
      onCopy: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });

    if (result.success && onSent) {
      onSent();
    }

    setTimeout(() => setSending(false), 500);
  };

  // Base classes
  const baseClasses = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all whitespace-nowrap";
  
  // Size classes
  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base"
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500",
    secondary: "bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30",
    minimal: "bg-transparent hover:bg-blue-600/10 text-blue-400 border border-transparent hover:border-blue-500/30"
  };

  return (
    <button
      onClick={handleClick}
      disabled={sending}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
      title={`Send notification to ${clientName} via Facebook Messenger`}
    >
      {copied ? (
        <>
          <span className="text-emerald-400">✓</span>
          <span>Copied!</span>
        </>
      ) : sending ? (
        <>
          <span className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></span>
          <span>Sending...</span>
        </>
      ) : (
        <>
          <span>{label.split(' ')[0]}</span>
          <span>{label.split(' ').slice(1).join(' ')}</span>
        </>
      )}
    </button>
  );
}
