"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/schedule", label: "Scheduling", icon: "📅" },
  { href: "/maintenance", label: "Maintenance", icon: "🔧" },
  { href: "/simulation", label: "Simulation", icon: "⚡" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/reports", label: "Reports", icon: "📊" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem("mb_user");
    if (u) setUser(JSON.parse(u));
  }, []);

  function logout() {
    localStorage.removeItem("mb_token");
    localStorage.removeItem("mb_user");
    router.push("/login");
  }

  return (
    <aside className="fixed top-0 left-0 h-full flex flex-col" style={{ width: 220, background: "#0f1629", borderRight: "1px solid #1e2d52", zIndex: 50 }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid #1e2d52" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🚇</span>
          <div>
            <div className="text-sm font-bold text-white leading-tight">MetroBuddy</div>
            <div className="text-xs" style={{ color: "#475569" }}>KMRL Operations</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: active ? "rgba(59,130,246,0.12)" : "transparent",
                color: active ? "#3b82f6" : "#94a3b8",
                borderLeft: active ? "2px solid #3b82f6" : "2px solid transparent",
                fontWeight: active ? 600 : 400,
              }}>
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #1e2d52" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#3b82f6" }}>
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="text-xs font-medium text-white">{user?.username || "User"}</div>
            <div className="text-xs capitalize" style={{ color: "#64748b" }}>{user?.role || "supervisor"}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full text-xs py-2 px-3 rounded-lg transition-colors text-left" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

