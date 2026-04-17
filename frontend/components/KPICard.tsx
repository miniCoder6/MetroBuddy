"use client";

interface KPICardProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export default function KPICard({ title, value, sub, color = "#3b82f6", icon }: KPICardProps) {
  return (
    <div className="card animate-fade-in" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-white" style={{ color }}>{value}</div>
      {sub && <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>{sub}</p>}
    </div>
  );
}

