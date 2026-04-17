"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { getPredictions, getMaintenanceLogs, getMaintenanceStats, addMaintenanceLog } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const urgencyColor: any = { critical: "#ef4444", warning: "#f59e0b", moderate: "#3b82f6", good: "#10b981" };
const urgencyBg: any = { critical: "rgba(239,68,68,0.08)", warning: "rgba(245,158,11,0.08)", moderate: "rgba(59,130,246,0.08)", good: "rgba(16,185,129,0.08)" };

export default function MaintenancePage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ train_id: "", type: "scheduled", description: "", technician: "", cost: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [p, l, s] = await Promise.all([getPredictions(), getMaintenanceLogs(), getMaintenanceStats()]);
      setPredictions(p.data); setLogs(l.data); setStats(s.data);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addMaintenanceLog({ ...logForm, cost: parseFloat(logForm.cost) || 0 });
      setShowLogForm(false);
      setLogForm({ train_id: "", type: "scheduled", description: "", technician: "", cost: "" });
      await load();
    } catch(e) {}
    setSubmitting(false);
  }

  const chartData = predictions.slice(0, 12).map(p => ({ name: p.train_id, days: p.predicted_days, urgency: p.urgency }));

  if (loading) return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center"><div className="text-4xl mb-3 animate-pulse-slow">🔧</div><p style={{ color:"#64748b" }} className="text-sm">Loading maintenance data...</p></div>
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
              <h1 className="text-xl font-bold text-white">Predictive Maintenance</h1>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>ML-powered maintenance forecasting (RandomForest model)</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRefreshing(true); load(); }} className="btn-primary" style={{ background: "#1e2d52", fontSize: "0.8rem" }}>
                {refreshing ? "⏳" : "🔄"} Refresh
              </button>
              <button onClick={() => setShowLogForm(true)} className="btn-primary">+ Log Maintenance</button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Health Score", value: `${stats?.health_score || 0}%`, color: stats?.health_score > 70 ? "#10b981" : "#ef4444" },
              { label: "Critical Trains", value: stats?.critical_trains || 0, color: "#ef4444" },
              { label: "Warning Trains", value: stats?.warning_trains || 0, color: "#f59e0b" },
              { label: "Total Logs", value: stats?.total_maintenance_logs || 0, color: "#3b82f6" },
            ].map((s, i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Days Until Maintenance — All Trains</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={22}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#141d35", border: "1px solid #1e2d52", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }}
                  formatter={(val: any) => [`${val} days`, "Predicted"]} />
                <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={urgencyColor[d.urgency] || "#3b82f6"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {Object.entries(urgencyColor).map(([k, v]: any) => (
                <span key={k} className="flex items-center gap-1.5 text-xs capitalize" style={{ color: "#64748b" }}>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: v }}></span>{k}
                </span>
              ))}
            </div>
          </div>

          {/* Predictions grid */}
          <div className="grid grid-cols-3 gap-3">
            {predictions.map((p, i) => (
              <div key={i} className="card" style={{ borderLeft: `3px solid ${urgencyColor[p.urgency]}`, background: urgencyBg[p.urgency] }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{p.train_id}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{p.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: urgencyColor[p.urgency] }}>{p.predicted_days}</div>
                    <div className="text-xs" style={{ color: "#64748b" }}>days left</div>
                  </div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(30,45,82,0.5)" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#64748b" }}>Mileage</span>
                    <span style={{ color: "#94a3b8" }}>{p.features_used?.mileage?.toLocaleString(undefined,{maximumFractionDigits:0})} km</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span style={{ color: "#64748b" }}>Avg Delay</span>
                    <span style={{ color: "#94a3b8" }}>{p.features_used?.avg_delay_minutes?.toFixed(1)} min</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span style={{ color: "#64748b" }}>Maint. Logs</span>
                    <span style={{ color: "#94a3b8" }}>{p.features_used?.maintenance_logs}</span>
                  </div>
                </div>
                <span className="badge mt-3 capitalize" style={{ background: `${urgencyColor[p.urgency]}20`, color: urgencyColor[p.urgency], border: `1px solid ${urgencyColor[p.urgency]}40` }}>
                  {p.urgency}
                </span>
              </div>
            ))}
          </div>

          {/* Logs table */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Maintenance Logs</h3>
            <div className="overflow-x-auto">
              <table>
                <thead><tr><th>Train ID</th><th>Type</th><th>Description</th><th>Technician</th><th>Date</th><th>Cost (₹)</th></tr></thead>
                <tbody>
                  {logs.slice(0, 15).map((l, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs font-semibold text-white">{l.train_id}</td>
                      <td><span className={`badge ${l.type === "unscheduled" ? "badge-red" : l.type === "overhaul" ? "badge-purple" : "badge-blue"}`}>{l.type}</span></td>
                      <td className="text-xs" style={{ color: "#94a3b8", maxWidth: 200 }}>{l.description}</td>
                      <td className="text-xs" style={{ color: "#64748b" }}>{l.technician}</td>
                      <td className="text-xs font-mono" style={{ color: "#64748b" }}>{l.performed_at}</td>
                      <td className="text-xs" style={{ color: "#10b981" }}>₹{l.cost?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Log form modal */}
        {showLogForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="card w-full max-w-md" style={{ padding: "2rem" }}>
              <h3 className="text-base font-bold text-white mb-4">Log Maintenance Activity</h3>
              <form onSubmit={handleAddLog} className="space-y-3">
                {[
                  { label: "Train ID", key: "train_id", placeholder: "MB-101" },
                  { label: "Description", key: "description", placeholder: "Wheelset inspection..." },
                  { label: "Technician", key: "technician", placeholder: "Rajesh Kumar" },
                  { label: "Cost (₹)", key: "cost", placeholder: "15000" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium block mb-1" style={{ color: "#94a3b8" }}>{f.label}</label>
                    <input value={(logForm as any)[f.key]} onChange={e => setLogForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }} required={f.key !== "cost"} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#94a3b8" }}>Type</label>
                  <select value={logForm.type} onChange={e => setLogForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }}>
                    {["scheduled","unscheduled","inspection","overhaul"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? "Saving..." : "Save Log"}</button>
                  <button type="button" onClick={() => setShowLogForm(false)} className="flex-1 py-2 px-4 rounded-lg text-sm text-white" style={{ background: "#1e2d52" }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

