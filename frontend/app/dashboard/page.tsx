"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import KPICard from "../../components/KPICard";
import { getTrainStats, getAlertStats, getLatestSchedule, getUpcomingMaintenance, autoGenerateAlerts } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#10b981","#f59e0b","#ef4444","#8b5cf6"];

const mockTrend = [
  {day:"Mon",fitness:142,conflicts:2},{day:"Tue",fitness:156,conflicts:1},{day:"Wed",fitness:148,conflicts:3},
  {day:"Thu",fitness:162,conflicts:0},{day:"Fri",fitness:171,conflicts:1},{day:"Sat",fitness:159,conflicts:2},{day:"Sun",fitness:177,conflicts:0}
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [alertStats, setAlertStats] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        await autoGenerateAlerts();
        const [s, a, sch, up] = await Promise.all([
          getTrainStats(), getAlertStats(), getLatestSchedule(), getUpcomingMaintenance(14)
        ]);
        setStats(s.data); setAlertStats(a.data); setSchedule(sch.data); setUpcoming(up.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const pieData = stats ? [
    {name:"Active", value: stats.active},
    {name:"Standby", value: stats.standby},
    {name:"Maintenance", value: stats.maintenance},
    {name:"IBL", value: stats.ibl},
  ] : [];

  const urgencyBadge = (days: number) => {
    if (days <= 3) return <span className="badge badge-red">{days}d — Critical</span>;
    if (days <= 7) return <span className="badge badge-yellow">{days}d — Warning</span>;
    return <span className="badge badge-blue">{days}d — Soon</span>;
  };

  if (loading) return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse-slow">🚇</div>
          <p style={{ color: "#64748b" }} className="text-sm">Loading operations data...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <main className="flex-1 min-h-screen grid-bg" style={{ background: "#0a0e1a" }}>
        {/* Header */}
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #1e2d52", background: "#0f1629" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Operations Dashboard</h1>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                Kochi Metro Rail Limited — {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <span className="status-dot status-active"></span>
                <span className="text-xs font-medium" style={{ color: "#10b981" }}>Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard title="Total Fleet" value={stats?.total || 0} sub="All registered trains" color="#3b82f6" icon="🚇" />
            <KPICard title="Active Service" value={stats?.active || 0} sub="Running on routes" color="#10b981" icon="✅" />
            <KPICard title="Critical Alerts" value={alertStats?.critical || 0} sub="Needs immediate action" color="#ef4444" icon="🚨" />
            <KPICard title="Fitness Score" value={schedule?.fitness_score ? `${schedule.fitness_score.toFixed(0)}` : "—"} sub="Last schedule quality" color="#8b5cf6" icon="📈" />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-4">
            {/* Fleet pie */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Fleet Status</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:"#141d35", border:"1px solid #1e2d52", borderRadius:8, color:"#e2e8f0", fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }}></span>
                    <span className="text-xs" style={{ color: "#94a3b8" }}>{d.name}: <strong className="text-white">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule trend */}
            <div className="card col-span-2">
              <h3 className="text-sm font-semibold text-white mb-4">Schedule Fitness Trend (7 Days)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={mockTrend}>
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#141d35", border:"1px solid #1e2d52", borderRadius:8, color:"#e2e8f0", fontSize:12 }} />
                  <Line type="monotone" dataKey="fitness" stroke="#3b82f6" strokeWidth={2} dot={{ fill:"#3b82f6", r:3 }} />
                  <Line type="monotone" dataKey="conflicts" stroke="#ef4444" strokeWidth={2} dot={{ fill:"#ef4444", r:3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs" style={{ color:"#64748b" }}><span className="w-3 h-0.5 inline-block bg-blue-500"></span>Fitness</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color:"#64748b" }}><span className="w-3 h-0.5 inline-block bg-red-500"></span>Conflicts</span>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            {/* Alerts panel */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Active Alerts</h3>
                <div className="flex gap-2">
                  <span className="badge badge-red">{alertStats?.critical || 0} Critical</span>
                  <span className="badge badge-yellow">{alertStats?.warning || 0} Warning</span>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { sev: "critical", label: "Train MB-302 Door Malfunction", sub: "Safety · Requires immediate inspection" },
                  { sev: "critical", label: "MB-115 Maintenance Overdue", sub: "Maintenance · 850 km overdue" },
                  { sev: "warning", label: "Low Stock: Type-B Brake Pads", sub: "Resource · 15% inventory remaining" },
                  { sev: "warning", label: "Peak Hour Coverage Gap", sub: "Scheduling · 17:00–19:00 Aluva-Petta" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: a.sev === "critical" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${a.sev === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}` }}>
                    <span className="text-base mt-0.5">{a.sev === "critical" ? "🚨" : "⚠️"}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: a.sev === "critical" ? "#ef4444" : "#f59e0b" }}>{a.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming maintenance */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Upcoming Maintenance</h3>
                <span className="badge badge-blue">{upcoming.length} trains</span>
              </div>
              <div className="space-y-2">
                {upcoming.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(30,45,82,0.5)" }}>
                    <div>
                      <p className="text-xs font-semibold text-white">{t.train_id}</p>
                      <p className="text-xs" style={{ color: "#64748b" }}>{t.depot || "Muttom Depot"}</p>
                    </div>
                    {urgencyBadge(t.predicted_maintenance_days)}
                  </div>
                ))}
                {upcoming.length === 0 && <p className="text-xs" style={{ color: "#64748b" }}>No upcoming maintenance in 14 days.</p>}
              </div>
            </div>
          </div>

          {/* Latest schedule preview */}
          {schedule?.schedule?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Latest Schedule Preview</h3>
                <div className="flex gap-2">
                  <span className="badge badge-blue">Fitness: {schedule.fitness_score?.toFixed(1)}</span>
                  {schedule.conflicts?.length > 0 && <span className="badge badge-red">{schedule.conflicts.length} Conflicts</span>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table>
                  <thead><tr><th>Train ID</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Status</th><th>Maint. Days</th></tr></thead>
                  <tbody>
                    {schedule.schedule.slice(0, 6).map((s: any, i: number) => (
                      <tr key={i}>
                        <td className="font-mono text-xs text-white">{s.train_id}</td>
                        <td className="text-xs" style={{ color: "#94a3b8" }}>{s.route}</td>
                        <td className="font-mono text-xs" style={{ color: "#3b82f6" }}>{s.departure}</td>
                        <td className="font-mono text-xs" style={{ color: "#3b82f6" }}>{s.arrival}</td>
                        <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-yellow"}`}>{s.status}</span></td>
                        <td className="text-xs text-white">{s.predicted_maintenance_days}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

