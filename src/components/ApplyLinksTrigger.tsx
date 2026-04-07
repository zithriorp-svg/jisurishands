"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ApplyLinksTrigger({ portfolios = [] }: { portfolios: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚀 UPGRADED: Now launches directly into a new secure tab!
  const handleOpenLink = (portfolioName: string, isAgentLink: boolean = false) => {
    const encodedPortfolio = encodeURIComponent(portfolioName);
    const link = isAgentLink 
      ? `${window.location.origin}/agent-apply?portfolio=${encodedPortfolio}` 
      : `${window.location.origin}/apply?portfolio=${encodedPortfolio}`;
    
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '450px', zIndex: 1000000, color: 'white' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '16px' }}>Master Application Links</h2>
        
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {portfolios && portfolios.length > 0 ? (
            portfolios.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#27272a', border: '1px solid #3f3f46', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#facc15', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>{p.name}</span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* CLIENT LINK */}
                  <button
                    onClick={() => handleOpenLink(p.name, false)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                      backgroundColor: '#2563eb', color: 'white', transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    👥 Client Link ↗
                  </button>

                  {/* AGENT LINK */}
                  <button
                    onClick={() => handleOpenLink(p.name, true)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                      backgroundColor: '#9333ea', color: 'white', transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    ⭐ Agent Link ↗
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#71717a', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No portfolios available.</p>
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(false)}
          style={{ marginTop: '24px', width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all font-bold text-white tracking-wide cursor-pointer w-full h-full focus:outline-none"
      >
        <span className="text-2xl mb-1">🔗</span>
        <span>Open Apply Links</span>
      </button>

      {isModalOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
