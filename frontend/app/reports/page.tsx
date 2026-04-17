"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { generateReport, explainSchedule, getReportHistory } from "../../lib/api";

export default function ReportsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [reportType, setReportType] = useState("operations");
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    getReportHistory().then(r => { setHistory(r.data); setHistLoading(false); }).catch(() => setHistLoading(false));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generateReport({ report_type: reportType, date: new Date().toISOString().split("T")[0] });
      setCurrentReport(res.data);
      const hist = await getReportHistory();
      setHistory(hist.data);
    } catch(e) {}
    setLoading(false);
  }

  async function handleExplain() {
    setExplaining(true);
    try {
      const res = await explainSchedule();
      setExplanation(res.data.explanation);
    } catch(e) { setExplanation("Could not generate explanation. Please ensure a schedule exists."); }
    setExplaining(false);
  }

  function downloadCSV() {
    if (!currentReport) return;
    const rows = [
      ["Field", "Value"],
      ["Report Type", currentReport.report_type],
      ["Date", currentReport.date],
      ["Generated At", currentReport.generated_at],
      ["Total Trains", currentReport.fleet_stats?.total_trains],
      ["Active Trains", currentReport.fleet_stats?.active],
      ["Standby", currentReport.fleet_stats?.standby],
      ["In Maintenance", currentReport.fleet_stats?.maintenance],
      ["Summary", currentReport.llm_summary],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `metrobuddy_report_${currentReport.date}.csv`;
    a.click();
  }

  const reportTypes = [
    { value: "operations", label: "Operations Report", icon: "⊞" },
    { value: "schedule", label: "Schedule Summary", icon: "📅" },
    { value: "maintenance", label: "Maintenance Report", icon: "🔧" },
    { value: "executive", label: "Executive Brief", icon: "📊" },
  ];

  return (
    <div className="flex" style={{ paddingLeft: 220 }}>
      <Sidebar />
      <main className="flex-1 min-h-screen grid-bg" style={{ background: "#0a0e1a" }}>
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #1e2d52", background: "#0f1629" }}>
          <h1 className="text-xl font-bold text-white">LLM Reports & Insights</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>AI-generated supervisor reports powered by Claude</p>
        </div>

        <div className="p-8 grid grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">📝 Generate Report</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#94a3b8" }}>Report Type</p>
                  <div className="space-y-2">
                    {reportTypes.map(r => (
                      <label key={r.value} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: reportType === r.value ? "rgba(59,130,246,0.1)" : "#0a0e1a", border: `1px solid ${reportType === r.value ? "rgba(59,130,246,0.4)" : "#1e2d52"}` }}>
                        <input type="radio" value={r.value} checked={reportType === r.value} onChange={() => setReportType(r.value)} className="accent-blue-500" />
                        <span className="text-base">{r.icon}</span>
                        <span className="text-xs font-medium" style={{ color: reportType === r.value ? "#3b82f6" : "#94a3b8" }}>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? "⏳ Generating..." : "🤖 Generate Report"}
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">💬 Explain Schedule</h3>
              <p className="text-xs mb-3" style={{ color: "#64748b" }}>Get an AI explanation of the latest generated schedule in plain English.</p>
              <button onClick={handleExplain} disabled={explaining} className="btn-primary w-full justify-center" style={{ background: "#7c3aed" }}>
                {explaining ? "⏳ Analyzing..." : "🧠 Explain Latest Schedule"}
              </button>
              {explanation && (
                <div className="mt-3 p-3 rounded-lg text-xs leading-relaxed" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
                  {explanation}
                </div>
              )}
            </div>

            {/* History */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">🗂 Report History</h3>
              {histLoading ? <p className="text-xs" style={{ color: "#64748b" }}>Loading...</p> : (
                <div className="space-y-2">
                  {history.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(30,45,82,0.5)" }}>
                      <div>
                        <span className="font-medium text-white capitalize">{r.report_type}</span>
                        <span className="ml-2 badge badge-blue">{r.date}</span>
                      </div>
                      <span style={{ color: "#64748b" }}>{r.requested_by}</span>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-xs" style={{ color: "#64748b" }}>No reports generated yet.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Report display */}
          <div className="col-span-2">
            {currentReport ? (
              <div className="space-y-4 animate-fade-in">
                {/* Header */}
                <div className="card" style={{ borderLeft: "3px solid #3b82f6" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#3b82f6" }}>MetroBuddy AI Report</p>
                      <h2 className="text-lg font-bold text-white capitalize">{currentReport.report_type} Report</h2>
                      <p className="text-xs mt-1" style={{ color: "#64748b" }}>Generated: {new Date(currentReport.generated_at).toLocaleString()} · By: {currentReport.generated_by}</p>
                    </div>
                    <button onClick={downloadCSV} className="btn-primary" style={{ background: "#1e2d52", fontSize: "0.8rem" }}>⬇ Export CSV</button>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="card" style={{ borderLeft: "3px solid #7c3aed", background: "rgba(124,58,237,0.04)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-sm font-semibold text-white">AI-Generated Summary</h3>
                    <span className="badge badge-purple">Claude AI</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#c4b5fd" }}>{currentReport.llm_summary}</p>
                </div>

                {/* Fleet stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total Fleet", value: currentReport.fleet_stats?.total_trains, color: "#e2e8f0" },
                    { label: "Active", value: currentReport.fleet_stats?.active, color: "#10b981" },
                    { label: "Standby", value: currentReport.fleet_stats?.standby, color: "#f59e0b" },
                    { label: "Maintenance", value: currentReport.fleet_stats?.maintenance, color: "#ef4444" },
                  ].map((s, i) => (
                    <div key={i} className="card text-center" style={{ padding: "1rem" }}>
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs mt-1" style={{ color: "#64748b" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Schedule summary */}
                {currentReport.schedule_summary && (
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-2">📅 Schedule Summary</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{currentReport.schedule_summary || "No schedule data available."}</p>
                  </div>
                )}

                {/* Maintenance alerts */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-2">🔧 Maintenance Alerts</h3>
                  <p className="text-xs leading-relaxed font-mono" style={{ color: currentReport.maintenance_alerts?.includes("None") ? "#10b981" : "#f59e0b" }}>
                    {currentReport.maintenance_alerts}
                  </p>
                </div>
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center py-28" style={{ color: "#64748b" }}>
                <span className="text-5xl mb-4">📊</span>
                <p className="text-sm font-medium text-white">No report generated yet</p>
                <p className="text-xs mt-2 text-center max-w-xs">Select a report type and click Generate Report to create an AI-powered supervisor summary.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

