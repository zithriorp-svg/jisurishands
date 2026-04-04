"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * CLIENT PORTAL LOGIN GATEWAY
 * 
 * Mobile-optimized login screen for borrowers.
 * Requires Client ID + Phone Number for authentication.
 */
export default function ClientPortalLogin() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, phone })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/portal/dashboard');
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-4xl">🏦</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Vault</h1>
          <p className="text-zinc-400 text-sm">Secure Borrower Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 text-center">Access Your Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client ID Field */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your Client ID"
                required
                className="w-full bg-zinc-900 border border-zinc-600 rounded-xl p-4 text-white text-lg font-mono text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600"
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxxx"
                required
                className="w-full bg-zinc-900 border border-zinc-600 rounded-xl p-4 text-white text-lg text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !clientId || !phone}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : (
                "Access Portal"
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 text-center">
              Your Client ID can be found on your loan documents or receipt.
              <br />
              Use the phone number registered with your account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          © {new Date().getFullYear()} FinTech Vault. All rights reserved.
        </p>
      </div>
    </div>
  );
}
