"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { logout } from "@/lib/auth";

interface LogoutButtonProps {
  username?: string;
}

export function LogoutButton({ username }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      // Redirect happens in logout()
    }
  };

  return (
    <div className="flex items-center gap-2">
      {username && (
        <span className="text-xs text-zinc-500 hidden sm:inline">
          <User className="w-3 h-3 inline mr-1" />
          {username}
        </span>
      )}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
