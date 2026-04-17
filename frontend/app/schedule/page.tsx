"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { generateSchedule, getLatestSchedule, getScheduleHistory } from "../../lib/api";

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [popSize, setPopSize] = useState(20);
  const [generations, setGenerations] = useState(30);
  const [maxMileage, setMaxMileage] = useState(500000);

  function addLog(msg: string, type = "info") {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  useEffect(() => {
    async function load() {
      try {
        const [sch, hist] = await Promise.all([getLatestSchedule(), getScheduleHistory(5)]);
        setSchedule(sch.data);
        setHistory(hist.data);
      } catch(e) {}
      setFetchLoading(false);
    }
    load();
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setLogs([]);
    addLog("Initializing scheduling pipeline...", "info");
    await new Promise(r => setTimeout(r, 200));
    addLog("Step 1: Constraint Programming — filtering feasible trains...", "blue");
    await new Promise(r => setTimeout(r, 400));
    addLog(`Step 2: Genetic Algorithm — pop_size=${popSize}, generations=${generations}`, "blue");
    await new Promise(r => setTimeout(r, 300));
    addLog("Running selection → crossover → mutation cycles...", "dim");
    try {
      const res = await generateSchedule({
        date: new Date().toISOString().split("T")[0],
        constraints: { max_mileage: maxMileage, maintenance_threshold: 2 },
        ga_params: { population_size: popSize, generations }
      });
      setSchedule(res.data);
      addLog(`✓ Hall of Fame schedule selected. Fitness: ${res.data.fitness_score}`, "green");
      addLog(`✓ Conflicts detected: ${res.data.conflicts.length}`, res.data.conflicts.length > 0 ? "yellow" : "green");
      addLog(`✓ Trains scheduled: ${res.data.schedule.length} / Feasible: ${res.data.feasible_trains}`, "green");
      addLog(`✓ Generation time: ${res.data.generation_time_ms.toFixed(0)}ms`, "green");
      const hist = await getScheduleHistory(5);
      setHistory(hist.data);
    } catch(e: any) {
      addLog(`✗ Error: ${e.response?.data?.detail || e.message}`, "red");
    }
    setLoading(false);
  }

  const statusBadge = (s: string) => {
    if (s === "active") return <span className="badge badge-green">Active</span>;
    if (s === "standby") return <span className="badge badge-yellow">Standby</span>;
    return <span className="badge badge-red">{s}</span>;
  };

  const maintBadge = (days: number) => {
    if (days <= 3) return <span style={{ color: "#ef4444" }} className="font-semibold">{days}d ⚠</span>;
    if (days <= 10) return <span style={{ color: "#f59e0b" }}>{days}d</span>;
    return <span style={{ color: "#10b981" }}>{days}d</span>;
  };

  return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <main className="flex-1 min-h-screen grid-bg" style={{ background: "#0a0e1a" }}>
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #1e2d52", background: "#0f1629" }}>
          <h1 className="text-xl font-bold text-white">Train Scheduling</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Constraint Programming + Genetic Algorithm Pipeline</p>
        </div>

        <div className="p-8 grid grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">⚙️ Algorithm Parameters</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94a3b8" }}>Population Size: <strong className="text-white">{popSize}</strong></label>
                  <input type="range" min={10} max={50} value={popSize} onChange={e => setPopSize(+e.target.value)} className="w-full accent-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94a3b8" }}>Generations: <strong className="text-white">{generations}</strong></label>
                  <input type="range" min={10} max={100} value={generations} onChange={e => setGenerations(+e.target.value)} className="w-full accent-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94a3b8" }}>Max Mileage: <strong className="text-white">{maxMileage.toLocaleString()} km</strong></label>
                  <input type="range" min={200000} max={600000} step={10000} value={maxMileage} onChange={e => setMaxMileage(+e.target.value)} className="w-full accent-blue-500" />
                </div>
                <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? "⏳ Generating..." : "🚀 Generate Schedule"}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">📋 Recent Schedules</h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center py-2 text-xs" style={{ borderBottom: "1px solid rgba(30,45,82,0.5)" }}>
                    <span style={{ color: "#94a3b8" }}>{h.date}</span>
                    <span style={{ color: "#3b82f6" }}>F:{h.fitness_score?.toFixed(0)}</span>
                    <span style={{ color: h.conflicts?.length > 0 ? "#ef4444" : "#10b981" }}>{h.conflicts?.length || 0} conf</span>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs" style={{ color: "#64748b" }}>No history yet.</p>}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="col-span-2 space-y-4">
            {/* Terminal */}
            <div>
              <h3 className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>Pipeline Output</h3>
              <div className="terminal">
                {logs.length === 0 && <span className="t-dim">Ready. Configure parameters and click Generate Schedule.</span>}
                {logs.map((log, i) => (
                  <div key={i} className={log.includes("✓") ? "t-green" : log.includes("✗") ? "t-red" : log.includes("Step") ? "t-blue" : "t-dim"}>
                    {log}
                  </div>
                ))}
                {loading && <div className="t-yellow animate-pulse">Processing...</div>}
              </div>
            </div>

            {/* Stats row */}
            {schedule && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Fitness Score", value: schedule.fitness_score?.toFixed(1), color: "#3b82f6" },
                  { label: "Trains Scheduled", value: schedule.schedule?.length, color: "#10b981" },
                  { label: "Conflicts", value: schedule.conflicts?.length, color: schedule.conflicts?.length > 0 ? "#ef4444" : "#10b981" },
                  { label: "Gen Time", value: `${schedule.generation_time_ms?.toFixed(0)}ms`, color: "#8b5cf6" },
                ].map((s, i) => (
                  <div key={i} className="card text-center" style={{ padding: "0.875rem" }}>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs mt-1" style={{ color: "#64748b" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Conflicts */}
            {schedule?.conflicts?.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>⚠ Scheduling Conflicts Detected</p>
                {schedule.conflicts.map((c: any, i: number) => (
                  <p key={i} className="text-xs" style={{ color: "#94a3b8" }}>• Train {c.train_id} assigned {c.count}× — duplicate route assignment</p>
                ))}
              </div>
            )}

            {/* Schedule table */}
            {schedule?.schedule?.length > 0 && (
              <div className="card" style={{ padding: "1rem" }}>
                <h3 className="text-sm font-semibold text-white mb-3">Full Schedule — {schedule.date}</h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table>
                    <thead>
                      <tr><th>Train ID</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Status</th><th>Mileage</th><th>Maint.</th></tr>
                    </thead>
                    <tbody>
                      {schedule.schedule.map((s: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs font-semibold text-white">{s.train_id}</td>
                          <td className="text-xs" style={{ color: "#94a3b8" }}>{s.route}</td>
                          <td className="font-mono text-xs" style={{ color: "#60a5fa" }}>{s.departure}</td>
                          <td className="font-mono text-xs" style={{ color: "#60a5fa" }}>{s.arrival}</td>
                          <td>{statusBadge(s.status)}</td>
                          <td className="text-xs" style={{ color: "#64748b" }}>{s.mileage?.toLocaleString(undefined,{maximumFractionDigits:0})} km</td>
                          <td>{maintBadge(s.predicted_maintenance_days)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!schedule && !fetchLoading && (
              <div className="card flex flex-col items-center justify-center py-16" style={{ color: "#64748b" }}>
                <span className="text-4xl mb-3">📅</span>
                <p className="text-sm">No schedule generated yet.</p>
                <p className="text-xs mt-1">Configure parameters and click Generate Schedule.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
