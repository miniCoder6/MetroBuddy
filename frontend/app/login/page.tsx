"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login(username, password);
      localStorage.setItem("mb_token", res.data.token);
      localStorage.setItem("mb_user", JSON.stringify({ username: res.data.username, role: res.data.role }));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center" style={{ background: "#0a0e1a" }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🚇</span>
            <span className="text-2xl font-bold text-white">MetroBuddy</span>
          </div>
          <p className="text-sm" style={{ color: "#64748b" }}>KMRL AI Operations Platform</p>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <h2 className="text-lg font-semibold text-white mb-1">Supervisor Login</h2>
          <p className="text-xs mb-6" style={{ color: "#64748b" }}>Enter your credentials to access the dashboard</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#1e2d52"}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#1e2d52"}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #1e2d52" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>Demo credentials:</p>
            <div className="space-y-1.5">
              {[["admin","admin123","Admin"], ["supervisor","super123","Supervisor"], ["planner","plan123","Planner"]].map(([u, p, r]) => (
                <button key={u} onClick={() => { setUsername(u); setPassword(p); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)", color: "#94a3b8" }}>
                  <span style={{ color: "#3b82f6" }}>{u}</span> / {p} <span className="float-right" style={{ color: "#64748b" }}>{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
