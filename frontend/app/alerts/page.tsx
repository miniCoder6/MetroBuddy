"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { getAlerts, getAlertStats, resolveAlert, autoGenerateAlerts } from "../../lib/api";

const sevColor: any = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };
const sevBg: any = { critical: "rgba(239,68,68,0.07)", warning: "rgba(245,158,11,0.07)", info: "rgba(59,130,246,0.07)" };
const typeIcon: any = { safety: "🛡️", maintenance: "🔧", scheduling: "📅", resource: "📦", data: "📡" };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("all");

  async function load() {
    try {
      const [a, s] = await Promise.all([getAlerts(false), getAlertStats()]);
      setAlerts(a.data); setStats(s.data);
    } catch(e) {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(id: string) {
    setResolving(id);
    try { await resolveAlert(id); await load(); } catch(e) {}
    setResolving(null);
  }

  async function handleAutoGenerate() {
    setGenerating(true);
    try { await autoGenerateAlerts(); await load(); } catch(e) {}
    setGenerating(false);
  }

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter || a.type === filter);

  if (loading) return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center"><div className="text-4xl mb-3 animate-pulse-slow">🔔</div><p style={{ color:"#64748b" }} className="text-sm">Loading alerts...</p></div>
      </div>
    </div>
  );

  return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <main className="flex-1 min-h-screen grid-bg" style={{ background: "#0a0e1a" }}>
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #1e2d52", background: "#0f1629" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Alerts & Notifications</h1>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Proactive system monitoring and conflict detection</p>
            </div>
            <button onClick={handleAutoGenerate} disabled={generating} className="btn-primary">
              {generating ? "⏳ Generating..." : "⚡ Auto-Generate Alerts"}
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Active", value: stats?.total || 0, color: "#e2e8f0" },
              { label: "Critical", value: stats?.critical || 0, color: "#ef4444" },
              { label: "Warning", value: stats?.warning || 0, color: "#f59e0b" },
              { label: "Info", value: stats?.info || 0, color: "#3b82f6" },
            ].map((s, i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {["all","critical","warning","info","safety","maintenance","scheduling","resource","data"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all"
                style={{ background: filter === f ? "#3b82f6" : "#141d35", color: filter === f ? "white" : "#64748b", border: filter === f ? "1px solid #3b82f6" : "1px solid #1e2d52" }}>
                {f}
              </button>
            ))}
          </div>

          {/* Alert list */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="card flex flex-col items-center justify-center py-16" style={{ color: "#64748b" }}>
                <span className="text-4xl mb-3">✅</span>
                <p className="text-sm">No active alerts matching this filter.</p>
              </div>
            )}
            {filtered.map((alert, i) => (
              <div key={i} className="card animate-fade-in" style={{ borderLeft: `3px solid ${sevColor[alert.severity] || "#64748b"}`, background: sevBg[alert.severity], padding: "1rem 1.25rem" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{typeIcon[alert.type] || "ℹ️"}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white">{alert.title}</p>
                        <span className="badge capitalize" style={{ background: `${sevColor[alert.severity]}20`, color: sevColor[alert.severity], border: `1px solid ${sevColor[alert.severity]}40` }}>
                          {alert.severity}
                        </span>
                        <span className="badge badge-blue capitalize">{alert.type}</span>
                      </div>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{alert.message}</p>
                      <div className="flex gap-4 mt-2">
                        {alert.train_id && <span className="text-xs font-mono" style={{ color: "#64748b" }}>Train: {alert.train_id}</span>}
                        <span className="text-xs" style={{ color: "#64748b" }}>
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleResolve(alert._id)} disabled={resolving === alert._id}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                    {resolving === alert._id ? "..." : "✓ Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
