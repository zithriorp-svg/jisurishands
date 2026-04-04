"use client";

import { useState, useEffect, useRef } from 'react';

export default function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only run this effect once on mount
    if (initialized.current) return;
    initialized.current = true;
    
    // Set initial time and start interval
    const updateTime = () => setTime(new Date());
    updateTime(); // Set initial time immediately
    
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Safe fallback while server is rendering or before hydration completes
  if (!time) {
    return (
      <div className="h-8 mb-4 inline-block w-64 bg-zinc-900/50 border border-zinc-800 rounded-md animate-pulse"></div>
    );
  }

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="inline-flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md mb-4 shadow-sm">
      <span className="text-zinc-300 text-xs sm:text-sm font-medium">{dateStr}</span>
      <span className="text-zinc-600">|</span>
      <span className="text-emerald-400 text-xs sm:text-sm font-mono tracking-widest">{timeStr}</span>
    </div>
  );
}
