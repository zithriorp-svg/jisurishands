import { Landmark, Unlock } from "lucide-react";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";
  const password = formData.get("password");
  // The master key as defined in your spec
  if (password === "123456") {
    redirect("/");
  }
}

export default function AuthPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f13] p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="relative">
            <Landmark className="text-white w-16 h-16" />
            <span className="absolute -top-2 -right-2 text-blue-500 text-2xl font-black drop-shadow-lg">$</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide mt-2">FinTech Connect</h1>
          <p className="text-gray-500 text-sm tracking-widest uppercase font-bold">Authorized Personnel Only</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1c1c21] border border-[#2a2a35] rounded-2xl p-6 shadow-2xl">
          <form action={login} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Master Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-[#0f0f13] border border-[#2a2a35] rounded-lg p-3.5 text-white focus:outline-none focus:border-[#00df82] text-center tracking-[0.2em] font-bold"
              />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#00df82] hover:bg-[#00c271] text-[#0f0f13] font-extrabold py-3.5 rounded-lg shadow-[0_0_15px_rgba(0,223,130,0.2)] transition-colors">
              <Unlock size={18} strokeWidth={3} />
              Access System
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
