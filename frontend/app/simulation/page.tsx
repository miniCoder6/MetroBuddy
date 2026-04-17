"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { getTrains, runSimulation, getSimulationHistory } from "../../lib/api";

export default function SimulationPage() {
  const [trains, setTrains] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [scenarioName, setScenarioName] = useState("Peak Hour Stress Test");
  const [disabledTrains, setDisabledTrains] = useState<string[]>([]);
  const [peakHours, setPeakHours] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [t, h] = await Promise.all([getTrains(), getSimulationHistory()]);
        setTrains(t.data); setHistory(h.data);
      } catch(e) {}
    }
    load();
  }, []);

  function toggleTrain(id: string) {
    setDisabledTrains(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function addLog(msg: string) { setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]); }

  async function handleRun() {
    setLoading(true); setLogs([]); setResult(null);
    addLog(`Starting simulation: "${scenarioName}"`);
    if (disabledTrains.length) addLog(`Removing ${disabledTrains.length} trains: ${disabledTrains.join(", ")}`);
    if (peakHours) addLog("Peak hours mode: doubling route frequency");
    if (emergencyMode) addLog("Emergency mode: activating all standby trains");
    await new Promise(r => setTimeout(r, 300));
    addLog("Running CP filter → GA optimization...");
    try {
      const res = await runSimulation({ scenario_name: scenarioName, disabled_trains: disabledTrains, peak_hours: peakHours, emergency_mode: emergencyMode });
      setResult(res.data);
      addLog(`✓ Schedule generated. Coverage: ${res.data.coverage_percentage}%`);
      addLog(`✓ Fitness: ${res.data.fitness_score} | Conflicts: ${res.data.conflict_count}`);
      addLog(`✓ Trains scheduled: ${res.data.trains_scheduled}/${res.data.trains_available}`);
      const h = await getSimulationHistory();
      setHistory(h.data);
    } catch(e: any) {
      addLog(`✗ Error: ${e.response?.data?.detail || e.message}`);
    }
    setLoading(false);
  }

  const coverageColor = (pct: number) => pct >= 90 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <main className="flex-1 min-h-screen grid-bg" style={{ background: "#0a0e1a" }}>
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #1e2d52", background: "#0f1629" }}>
          <h1 className="text-xl font-bold text-white">What-If Simulation</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Explore scenarios before finalizing the schedule</p>
        </div>

        <div className="p-8 grid grid-cols-3 gap-6">
          {/* Config panel */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">⚡ Scenario Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "#94a3b8" }}>Scenario Name</label>
                  <input value={scenarioName} onChange={e => setScenarioName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }} />
                </div>

                {/* Toggles */}
                {[
                  { label: "Peak Hours Mode", sub: "Double route frequency", val: peakHours, set: setPeakHours, color: "#f59e0b" },
                  { label: "Emergency Mode", sub: "Activate all standby trains", val: emergencyMode, set: setEmergencyMode, color: "#ef4444" },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(30,45,82,0.4)", border: "1px solid #1e2d52" }}>
                    <div>
                      <p className="text-xs font-medium text-white">{t.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{t.sub}</p>
                    </div>
                    <button onClick={() => t.set(!t.val)} className="relative w-10 h-5 rounded-full transition-all" style={{ background: t.val ? t.color : "#1e2d52" }}>
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: t.val ? "22px" : "2px" }}></span>
                    </button>
                  </div>
                ))}

                {/* Train disabling */}
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#94a3b8" }}>Disable Trains (simulate breakdown)</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {trains.filter(t => t.status !== "maintenance").slice(0, 16).map(t => (
                      <label key={t.train_id} className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors hover:bg-opacity-10" style={{ background: disabledTrains.includes(t.train_id) ? "rgba(239,68,68,0.1)" : "transparent" }}>
                        <input type="checkbox" checked={disabledTrains.includes(t.train_id)} onChange={() => toggleTrain(t.train_id)} className="accent-red-500" />
                        <span className="text-xs text-white">{t.train_id}</span>
                        <span className="text-xs ml-auto" style={{ color: "#64748b" }}>{t.status}</span>
                      </label>
                    ))}
                  </div>
                  {disabledTrains.length > 0 && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{disabledTrains.length} train(s) will be excluded</p>}
                </div>

                <button onClick={handleRun} disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? "⏳ Running..." : "▶ Run Simulation"}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">📋 Simulation History</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="p-2 rounded-lg text-xs" style={{ background: "#0a0e1a", border: "1px solid #1e2d52" }}>
                    <p className="font-medium text-white">{h.scenario_name}</p>
                    <div className="flex gap-3 mt-1" style={{ color: "#64748b" }}>
                      <span>F:{h.fitness_score}</span>
                      <span>Cov:{h.coverage_percentage}%</span>
                      <span style={{ color: h.conflict_count > 0 ? "#ef4444" : "#10b981" }}>{h.conflict_count} conf</span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs" style={{ color: "#64748b" }}>No simulations run yet.</p>}
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="col-span-2 space-y-4">
            {/* Terminal */}
            <div>
              <h3 className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>Simulation Output</h3>
              <div className="terminal">
                {logs.length === 0 && <span className="t-dim">Ready. Configure scenario and click Run Simulation.</span>}
                {logs.map((l, i) => (
                  <div key={i} className={l.includes("✓") ? "t-green" : l.includes("✗") ? "t-red" : l.includes("Starting") ? "t-blue" : "t-dim"}>{l}</div>
                ))}
                {loading && <div className="t-yellow animate-pulse">Optimizing...</div>}
              </div>
            </div>

            {/* Result cards */}
            {result && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Coverage", value: `${result.coverage_percentage}%`, color: coverageColor(result.coverage_percentage) },
                    { label: "Fitness Score", value: result.fitness_score, color: "#3b82f6" },
                    { label: "Trains Used", value: `${result.trains_scheduled}/${result.trains_available}`, color: "#10b981" },
                    { label: "Conflicts", value: result.conflict_count, color: result.conflict_count > 0 ? "#ef4444" : "#10b981" },
                  ].map((s, i) => (
                    <div key={i} className="card text-center" style={{ padding: "0.875rem" }}>
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs mt-1" style={{ color: "#64748b" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coverage bar */}
                <div className="card">
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: "#94a3b8" }}>Route Coverage</span>
                    <span style={{ color: coverageColor(result.coverage_percentage) }}>{result.coverage_percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full" style={{ background: "#1e2d52" }}>
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${result.coverage_percentage}%`, background: coverageColor(result.coverage_percentage) }}></div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#64748b" }}>
                    {result.trains_scheduled} trains covering {result.routes_total} routes — generated in {result.generation_time_ms?.toFixed(0)}ms
                  </p>
                </div>

                {/* Schedule table */}
                <div className="card" style={{ padding: "1rem" }}>
                  <h3 className="text-sm font-semibold text-white mb-3">Simulated Schedule — {result.scenario_name}</h3>
                  <div className="overflow-y-auto max-h-80">
                    <table>
                      <thead><tr><th>Train</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Status</th></tr></thead>
                      <tbody>
                        {result.schedule.map((s: any, i: number) => (
                          <tr key={i}>
                            <td className="font-mono text-xs font-semibold text-white">{s.train_id}</td>
                            <td className="text-xs" style={{ color: "#94a3b8" }}>{s.route}</td>
                            <td className="font-mono text-xs" style={{ color: "#60a5fa" }}>{s.departure}</td>
                            <td className="font-mono text-xs" style={{ color: "#60a5fa" }}>{s.arrival}</td>
                            <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-yellow"}`}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!result && !loading && (
              <div className="card flex flex-col items-center justify-center py-20" style={{ color: "#64748b" }}>
                <span className="text-5xl mb-4">⚡</span>
                <p className="text-sm font-medium">No simulation run yet.</p>
                <p className="text-xs mt-1">Configure a scenario on the left and click Run Simulation.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
