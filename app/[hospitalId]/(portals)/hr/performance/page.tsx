"use client";

import { useState, useMemo, useEffect } from "react";
import {
  usePerformanceDashboardV2,
  usePerformanceDoctors,
  usePerformanceNurses,
  usePerformanceStaff,
  useEmployeeTrends,
} from "@/lib/integrations/hooks/useHRQueries";
import {
  Award,
  Users,
  Activity,
  AlertTriangle,
  Star,
  Stethoscope,
  Heart,
  Briefcase,
  ChevronRight,
  Calendar,
  BarChart3,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  ChevronDown,
  Target,
} from "lucide-react";
import type { PerformanceEmployee } from "@/lib/integrations/services/performance.service";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// Helper for success states (Green for positive, Gray for neutral)
function successColor(val: number | string) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (n >= 70 || n >= 4) return "#10b981"; // Green for positive
  return "#64748b"; // Gray for neutral
}

function scoreLabel(score: number) {
  if (score >= 4) return "Excellent";
  if (score >= 3) return "Good";
  if (score >= 2) return "Needs Work";
  return "Critical";
}

function roleIcon(role: string) {
  if (role === "doctor") return <Stethoscope size={14} className="perf-role-icon" />;
  if (role === "nurse") return <Heart size={14} className="perf-role-icon" />;
  return <Briefcase size={14} className="perf-role-icon" />;
}

const PRIMARY_BLUE = "#2563eb";
const SUCCESS_GREEN = "#10b981";

function Avatar({ name, image, size = 36 }: { name: string; image?: string; size?: number }) {
  if (image) {
    return <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: PRIMARY_BLUE,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const max = 5;
  const pct = Math.min(1, score / max);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PRIMARY_BLUE} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────
function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  if (value > 0) return <span className="perf-trend-up"><ArrowUpRight size={11} /> +{value}%</span>;
  if (value < 0) return <span className="perf-trend-down"><ArrowDownRight size={11} /> {value}%</span>;
  return <span className="perf-trend-neutral"><Minus size={11} /> 0%</span>;
}

// ─── Risk Badges ─────────────────────────────────────────────────────────────
function RiskBadges({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="perf-risk-row">
      {flags.includes("low_attendance") && (
        <span className="perf-risk-badge"><AlertTriangle size={10} /> Attendance</span>
      )}
      {flags.includes("low_rating") && (
        <span className="perf-risk-badge"><Star size={10} /> Low Rating</span>
      )}
      {flags.includes("burnout_risk") && (
        <span className="perf-risk-badge"><ShieldAlert size={10} /> Burnout</span>
      )}
    </div>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────
function EmployeeRow({
  emp,
  onSelect,
  selected,
}: {
  emp: PerformanceEmployee;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <div
      className={`perf-emp-row ${selected ? "perf-emp-row-active" : ""}`}
      onClick={() => onSelect(emp._id)}
    >
      <div className="perf-emp-rank">#{emp.rank ?? "—"}</div>
      <Avatar name={emp.name} image={emp.image} size={34} />
      <div className="perf-emp-info">
        <span className="perf-emp-name">{emp.name}</span>
        <div className="perf-emp-meta">
          <span className="perf-emp-role" style={{ color: PRIMARY_BLUE }}>
            {roleIcon(emp.role)} {emp.role}
          </span>
          {emp.employeeId && <span className="perf-emp-id">#{emp.employeeId}</span>}
        </div>
      </div>
      <div className="perf-emp-att">
        <span className="perf-att-pct">{emp.attendance.rate}%</span>
        <span className="perf-att-label">Attend.</span>
      </div>
      <div className="perf-emp-score-col">
        <span className="perf-score-val" style={{ color: PRIMARY_BLUE }}>
          {emp.compositeScore.toFixed(1)}
        </span>
        <span className="perf-score-label" style={{ color: PRIMARY_BLUE }}>
          {scoreLabel(emp.compositeScore)}
        </span>
      </div>
      <div className="perf-emp-trend">
        <TrendBadge value={emp.improvementVsPrevMonth} />
      </div>
      <div className="perf-emp-flags">
        <RiskBadges flags={emp.riskFlags} />
      </div>
      <ChevronRight size={14} className="perf-emp-chevron" />
    </div>
  );
}

// ─── Trend Mini-Chart ─────────────────────────────────────────────────────────
function TrendChart({ trends }: { trends: any[] }) {
  if (!trends || trends.length === 0) {
    return <div className="perf-trend-empty">No trend data available yet.</div>;
  }
  const scores = trends.map((t) => t.compositeScore);
  const maxScore = Math.max(...scores, 5);
  const minScore = 0;
  const range = maxScore - minScore || 1;
  const W = 340, H = 90, LABEL_H = 18; // extra space below for month labels
  const TOTAL_H = H + LABEL_H;
  const step = (W - 40) / (trends.length - 1 || 1);
  const points = trends.map((t, i) => ({
    x: 20 + i * step,
    y: H - 10 - ((t.compositeScore - minScore) / range) * (H - 20),
  }));
  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${points[0].x},${H} L${poly.split(" ").map((pt, i) => points[i] ? `${points[i].x},${points[i].y}` : pt).join(" L")} L${points[points.length - 1].x},${H} Z`;

  return (
    <div className="perf-trend-chart-wrap">
      <svg width="100%" viewBox={`0 0 ${W} ${TOTAL_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="trendGradBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY_BLUE} stopOpacity="0.15" />
            <stop offset="100%" stopColor={PRIMARY_BLUE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendGradBlue)" />
        <polyline points={poly} fill="none" stroke={PRIMARY_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={PRIMARY_BLUE} />
            <text x={p.x} y={H + 12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">
              {trends[i]?.label?.split(" ")?.[0] ?? ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Employee Detail Panel ────────────────────────────────────────────────────
function EmployeePanel({
  emp,
  onClose,
}: {
  emp: PerformanceEmployee;
  onClose: () => void;
}) {
  const { data: trendData, isLoading: trendLoading } = useEmployeeTrends(emp._id);
  const trends = trendData?.data?.trends ?? [];

  const rm = emp.roleMetrics;

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const el = document.getElementById("perf-detail-panel-id");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [emp._id]);

  return (
    <div className="perf-detail-panel" id="perf-detail-panel-id">
      <button className="perf-panel-close" onClick={onClose}><X size={16} /></button>
      <div className="perf-panel-header">
        <Avatar name={emp.name} image={emp.image} size={52} />
        <div>
          <div className="perf-panel-name">{emp.name}</div>
          <div className="perf-panel-meta">
            <span style={{ color: PRIMARY_BLUE }}>{roleIcon(emp.role)} {emp.role}</span>
            {emp.specialization && <span className="perf-panel-spec">· {emp.specialization}</span>}
            {emp.employeeId && <span className="perf-panel-id">#{emp.employeeId}</span>}
          </div>
          <div className="perf-panel-period">Period: {emp.period}</div>
        </div>
      </div>

      {/* Score overview */}
      <div className="perf-panel-scores">
        <div className="perf-panel-score-item">
          <ScoreRing score={emp.compositeScore} size={52} />
          <div className="perf-panel-score-info">
            <span className="perf-panel-score-num" style={{ color: PRIMARY_BLUE }}>
              {emp.compositeScore.toFixed(2)} / 5.00
            </span>
            <span className="perf-panel-score-sub">Composite Score</span>
            <span className="perf-panel-score-badge" style={{ color: PRIMARY_BLUE }}>
              {scoreLabel(emp.compositeScore)}
            </span>
          </div>
        </div>
        <div className="perf-panel-divider" />
        <div className="perf-panel-score-item">
          <div style={{ fontSize: 28, fontWeight: 700, color: successColor(emp.attendance.rate) }}>
            {emp.attendance.rate}%
          </div>
          <div className="perf-panel-score-info">
            <span className="perf-panel-score-sub">Attendance Rate</span>
            <span className="perf-panel-score-sub" style={{ opacity: 0.6 }}>
              {emp.attendance.presentDays}/{emp.attendance.totalDays} days
            </span>
          </div>
        </div>
        {emp.improvementVsPrevMonth !== null && (
          <>
            <div className="perf-panel-divider" />
            <div className="perf-panel-score-item">
              <TrendBadge value={emp.improvementVsPrevMonth} />
              <span className="perf-panel-score-sub">vs Last Month</span>
            </div>
          </>
        )}
      </div>

      <RiskBadges flags={emp.riskFlags} />

      {/* Role KPIs */}
      <div className="perf-panel-section-title">Role KPIs</div>
      <div className="perf-panel-kpis">
        {emp.role === "doctor" && (
          <>
            <KpiItem label="Appointments" value={rm.totalAppointments ?? 0} />
            <KpiItem label="Completed" value={rm.completedAppointments ?? 0} />
            <KpiItem label="Prescriptions" value={rm.totalPrescriptions ?? 0} />
            <KpiItem label="Avg Rating" value={`${(rm.avgPatientRating ?? 0).toFixed(1)} ★`} />
            <KpiItem label="Feedback" value={rm.feedbackCount ?? 0} />
            {rm.followUpRatio !== undefined && (
              <KpiItem label="Follow-up Ratio" value={`${(rm.followUpRatio * 100).toFixed(0)}%`} />
            )}
          </>
        )}
        {emp.role === "nurse" && (
          <>
            <KpiItem label="Total Tasks" value={rm.totalTasks ?? 0} />
            <KpiItem label="Completed" value={rm.completedTasks ?? 0} />
            <KpiItem label="Task Rate" value={`${rm.taskCompletionRate ?? 0}%`} />
            <KpiItem label="Med Tasks" value={rm.medicationTasks ?? 0} />
            <KpiItem label="Med Accuracy" value={`${rm.medicationAccuracy ?? 0}%`} />
          </>
        )}
        {emp.role === "staff" && (
          <>
            <KpiItem label="Daily Throughput" value={rm.dailyThroughput ?? 0} />
          </>
        )}
      </div>

      {/* 6-month trend */}
      <div className="perf-panel-section-title">6-Month Performance Trend</div>
      {trendLoading ? (
        <div className="perf-trend-loading">Loading trends…</div>
      ) : (
        <TrendChart trends={trends} />
      )}
    </div>
  );
}

function KpiItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="perf-kpi-item">
      <span className="perf-kpi-val" style={{ color: PRIMARY_BLUE }}>{value}</span>
      <span className="perf-kpi-label">{label}</span>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="perf-stat-card">
      <div className="perf-stat-icon">
        <Icon size={14} />
      </div>
      <div className="perf-stat-body">
        <div className="perf-stat-value">{value}</div>
        <div className="perf-stat-label">{label}</div>
        {sub && <div className="perf-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Top Performer Card ───────────────────────────────────────────────────────
function TopPerformerCard({
  emp,
  position,
  onSelect,
}: {
  emp: PerformanceEmployee;
  position: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`perf-top-card ${position === 0 ? "perf-top-card-highlight" : ""}`}
      onClick={() => onSelect(emp._id)}
    >
      <div className="perf-top-medal">#{position + 1}</div>
      <Avatar name={emp.name} image={emp.image} size={42} />
      <div className="perf-top-info">
        <div className="perf-top-name">{emp.name}</div>
        <div style={{ color: "#64748b", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
          {roleIcon(emp.role)} {emp.specialization ?? emp.role}
        </div>
      </div>
      <div className="perf-top-score" style={{ color: PRIMARY_BLUE }}>
        {emp.compositeScore.toFixed(1)}
        <span style={{ fontSize: 10, opacity: 0.7 }}>/5</span>
      </div>
    </div>
  );
}

// ─── Department Summary Bar ───────────────────────────────────────────────────
function DeptBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="perf-dept-bar-row">
      <span className="perf-dept-bar-label">{label}</span>
      <div className="perf-dept-bar-track">
        <div className="perf-dept-bar-fill" style={{ width: `${pct}%`, background: PRIMARY_BLUE }} />
      </div>
      <span className="perf-dept-bar-val">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PerformanceAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "nurses" | "staff">("overview");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search: immediate clear when empty, 300ms delay when typing
  useEffect(() => {
    setCurrentPage(1);
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);


  const params = { month: selectedMonth, year: selectedYear };

  const { data: dashboard, isLoading: dashLoading } = usePerformanceDashboardV2(params);
  const { data: doctorData, isLoading: doctorLoading } = usePerformanceDoctors(
    activeTab === "doctors" ? params : undefined,
  );
  const { data: nurseData, isLoading: nurseLoading } = usePerformanceNurses(
    activeTab === "nurses" ? params : undefined,
  );
  const { data: staffData, isLoading: staffLoading } = usePerformanceStaff(
    activeTab === "staff" ? params : undefined,
  );

  const dash = dashboard?.data;
  const stats = dash?.stats;

  // Active role employees list
  const activeEmployees = useMemo(() => {
    let list: PerformanceEmployee[] = [];
    if (activeTab === "overview") list = dash?.employees ?? [];
    else if (activeTab === "doctors") list = doctorData?.data?.employees ?? [];
    else if (activeTab === "nurses") list = nurseData?.data?.employees ?? [];
    else if (activeTab === "staff") list = staffData?.data?.employees ?? [];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          (e.specialization?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [activeTab, dash, doctorData, nurseData, staffData, debouncedSearch]);


  const selectedEmp = useMemo(
    () => activeEmployees.find((e) => e._id === selectedEmpId) ?? null,
    [activeEmployees, selectedEmpId],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, selectedYear]);

  const totalPages = Math.ceil(activeEmployees.length / itemsPerPage);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return activeEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [activeEmployees, currentPage]);

  const isLoading = dashLoading || (activeTab === "doctors" && doctorLoading) ||
    (activeTab === "nurses" && nurseLoading) || (activeTab === "staff" && staffLoading);

  return (
    <div className="perf-root">
      <style>{`
        /* ─── HMS Enterprise Blue Theme ──────────────────────────── */
        .perf-root {
          --bg: #f8fafc;
          --surface: #ffffff;
          --surface-alt: #f1f5f9;
          --border: #e2e8f0;
          --text: #334155;
          --muted: #64748b;
          --primary: #2563eb;
          --primary-light: #eff6ff;
          --success: #10b981;
          --success-light: #ecfdf5;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          color: var(--text);
          font-size: 13px;
        }

        /* ─── Layout ─────────────────────────────────────────────── */
        .perf-layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
        @media (min-width: 1024px) { .perf-layout { flex-direction: row; } }
        .perf-main { flex: 1; overflow-y: auto; width: 100%; transition: max-width 0.3s ease; }
        @media (min-width: 1024px) { .perf-main { max-width: calc(100% - 360px); } }
        .perf-main.full-width { max-width: 100%; }

        /* ─── Header ─────────────────────────────────────────────── */
        .perf-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        .perf-title { font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.01em; }
        @media (min-width: 768px) { .perf-title { font-size: 20px; } }
        .perf-subtitle { font-size: 10px; color: var(--muted); margin-top: 2px; }
        @media (min-width: 768px) { .perf-subtitle { font-size: 12px; } }
        
        .perf-filters { display: flex; gap: 8px; align-items: center; }
        .perf-select-wrap { position: relative; display: flex; align-items: center; }
        .perf-select {
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); padding: 7px 32px 7px 12px; font-size: 11px; font-weight: 600; cursor: pointer; outline: none;
          appearance: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s;
        }
        .perf-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        /* ─── Stats Cards ────────────────────────────────────────── */
        .perf-stats-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 8px; 
          margin-bottom: 20px; 
        }
        @media (min-width: 640px) { .perf-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px) { .perf-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 10px; } }
        @media (min-width: 1280px) { .perf-stats-grid { grid-template-columns: repeat(8, 1fr); } }

        .perf-stat-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;
          transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          min-height: 75px; justify-content: space-between;
        }
        .perf-stat-card:hover { border-color: var(--primary); transform: translateY(-1px); }
        .perf-stat-icon { width: 22px; height: 22px; border-radius: 6px; background: #eff6ff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 10px; }
        .perf-stat-value { font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.1; }
        .perf-stat-label { font-size: 8px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; margin-top: 2px;}
        .perf-stat-sub { font-size: 8px; color: #94a3b8; margin-top: -2px; }

        /* ─── Department Overview ─────────────────────────────────── */
        .perf-dept-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 24px; }
        .perf-section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .perf-dept-bars { display: flex; flex-direction: column; gap: 12px; }
        .perf-dept-bar-row { display: grid; grid-template-columns: 80px 1fr 40px; align-items: center; gap: 12px; }
        .perf-dept-bar-label { font-size: 11px; font-weight: 600; color: var(--muted); }
        .perf-dept-bar-track { height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .perf-dept-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .perf-dept-bar-val { font-size: 11px; font-weight: 700; color: var(--primary); text-align: right; }

        /* ─── Tabs ───────────────────────────────────────────────── */
        .perf-tabs-container { display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 4px; margin-bottom: 16px; width: 100%; max-width: fit-content; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
        .perf-tabs-container::-webkit-scrollbar { display: none; }
        .perf-tab {
          padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 600;
          color: var(--muted); transition: all 0.2s; cursor: pointer; border: none; background: transparent;
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
        }
        @media (min-width: 768px) { .perf-tab { padding: 8px 18px; font-size: 12px; } }
        .perf-tab:hover { color: var(--primary); }
        .perf-tab.active { background: var(--primary); color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.2); }

        /* ─── Top Performers ─────────────────────────────────────── */
        .perf-top-section { margin-bottom: 24px; }
        .perf-top-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        @media (min-width: 768px) { .perf-top-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; } }
        .perf-top-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px;
          display: flex; align-items: center; gap: 10px; position: relative; transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer;
        }
        @media (min-width: 768px) { .perf-top-card { padding: 16px; gap: 12px; } }
        .perf-top-card:hover { border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .perf-top-card-highlight { border: 1.5px solid #dbeafe; background: #f0f7ff; }
        .perf-top-medal { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--primary); background: #eff6ff; border-radius: 50%; opacity: 0.8; }
        .perf-top-info { flex: 1; min-width: 0; }
        .perf-top-name { font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) { .perf-top-name { font-size: 13px; } }
        .perf-top-score { font-size: 14px; font-weight: 800; color: var(--primary); }
        @media (min-width: 768px) { .perf-top-score { font-size: 16px; } }

        /* ─── Employee List ───────────────────────────────────────── */
        .perf-emp-list { display: flex; flex-direction: column; gap: 6px; }
        .perf-emp-row {
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 8px 10px; display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        @media (min-width: 768px) { .perf-emp-row { gap: 16px; padding: 12px 16px; } }
        .perf-emp-row:hover { background: #f8faff; border-color: #dbeafe; }
        .perf-emp-row.perf-emp-row-active { border-color: var(--primary); background: #f0f7ff; box-shadow: 0 0 0 1px var(--primary); }
        .perf-emp-rank { width: 20px; font-size: 11px; font-weight: 700; color: #94a3b8; }
        
        .perf-emp-trend { display: none; }
        .perf-emp-flags { display: none; }
        @media (min-width: 640px) { .perf-emp-trend { display: block; } }
        @media (min-width: 1024px) { .perf-emp-flags { display: flex; } }
        .perf-emp-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
        .perf-emp-name { font-size: 12px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) { .perf-emp-name { font-size: 13px; } }
        .perf-emp-meta { font-size: 10px; color: var(--muted); margin-top: 1px; display: flex; align-items: center; gap: 6px; }
        .perf-emp-id { font-size: 9px; color: #94a3b8; }
        
        .perf-emp-stats-wrap { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; pt-2; mt-1; }
        @media (min-width: 768px) { .perf-emp-stats-wrap { border: none; pt: 0; mt: 0; gap: 16px; justify-content: flex-end; } }

        .perf-emp-att { text-align: left; }
        @media (min-width: 768px) { .perf-emp-att { width: 80px; text-align: center; } }
        .perf-att-pct { display: block; font-size: 11px; font-weight: 700; color: #334155; }
        @media (min-width: 768px) { .perf-att-pct { font-size: 12px; } }
        .perf-att-label { color: var(--muted); font-size: 9px; font-weight: 500; }
        
        .perf-emp-score-col { text-align: center; }
        @media (min-width: 768px) { .perf-emp-score-col { width: 80px; text-align: center; } }
        .perf-score-val { display: block; font-size: 11px; font-weight: 800; color: var(--primary); }
        @media (min-width: 768px) { .perf-score-val { font-size: 14px; } }
        .perf-score-label { display: block; font-size: 9px; color: var(--muted); font-weight: 600; }
        .perf-emp-chevron { display: none; }
        @media (min-width: 1024px) { .perf-emp-chevron { display: block; color: #cbd5e1; } }

        /* ─── Detail Panel ───────────────────────────────────────── */
        .perf-detail-panel {
          width: 100%; background: var(--surface); border-top: 1px solid var(--border);
          padding: 24px; z-index: 50;
        }
        @media (min-width: 1024px) { 
          .perf-detail-panel { 
            width: 360px; height: 100vh; position: sticky; top: 0; border-top: none; border-left: 1px solid var(--border); overflow-y: auto;
          } 
        }
        .perf-panel-close { float: right; color: var(--muted); cursor: pointer; padding: 4px; }
        .perf-panel-header { display: flex; gap: 16px; margin-bottom: 24px; align-items: center; }
        .perf-panel-name { font-size: 16px; font-weight: 700; color: #1e293b; }
        @media (min-width: 768px) { .perf-panel-name { font-size: 18px; } }
        .perf-panel-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
        @media (min-width: 768px) { .perf-panel-meta { font-size: 12px; } }
        .perf-panel-scores { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
        @media (min-width: 640px) { .perf-panel-scores { flex-direction: row; } }
        .perf-panel-score-item { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .perf-panel-divider { display: none; }
        @media (min-width: 640px) { .perf-panel-divider { display: block; width: 1px; height: 40px; background: var(--border); } }
        .perf-panel-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 20px 0 12px; display: flex; align-items: center; gap: 8px; }
        .perf-panel-section-title::after { content: ''; flex: 1; height: 1px; background: #f1f5f9; }
        .perf-panel-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 640px) { .perf-panel-kpis { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .perf-panel-kpis { grid-template-columns: 1fr 1fr; } }
        .perf-kpi-item { background: white; border: 1px solid var(--border); border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .perf-kpi-val { font-size: 14px; font-weight: 700; color: var(--primary); display: block; }
        .perf-kpi-label { font-size: 9px; color: var(--muted); margin-top: 2px; display: block; }

        .perf-trend-up { font-size: 11px; font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 2px; }
        .perf-trend-down { font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 2px; }
        .perf-trend-neutral { font-size: 11px; font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 2px; }
        
        .perf-risk-badge { font-size: 9px; font-weight: 700; color: #64748b; background: white; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
      `}</style>


      <div className="perf-layout">
        {/* ── Main Column ── */}
        <div className={`perf-main ${!selectedEmp ? "full-width" : ""}`}>
          {/* Header */}
          <div className="perf-header bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
            <div className="perf-header-top flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight uppercase leading-none">Performance Analytics</h1>
                <div className="text-[8px] sm:text-[9px] font-medium text-slate-500 uppercase tracking-widest mt-1 hidden sm:block">
                  Enterprise-grade HR performance reporting · all data from live records
                </div>
              </div>
              <div className="perf-filters flex-wrap">
                <Calendar size={14} style={{ color: "var(--muted)" }} />
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    className="perf-select"
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedEmpId(null); }}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--muted)" }} />
                </div>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    className="perf-select"
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedEmpId(null); }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--muted)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid - always from dashboard API */}
          <div className="perf-stats-grid">
            {dashLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="perf-skeleton" style={{ height: 72 }} />
              ))
            ) : (
              <>
                <StatCard icon={Users} label="Total Staff" value={stats?.totalStaff ?? 0} />
                <StatCard icon={Stethoscope} label="Doctors" value={stats?.totalDoctors ?? 0} />
                <StatCard icon={Heart} label="Nurses" value={stats?.totalNurses ?? 0} />
                <StatCard icon={Briefcase} label="Staff" value={stats?.totalStaffCount ?? 0} />
                <StatCard icon={UserCheck} label="Avg Attend." value={`${stats?.avgAttendanceRate ?? 0}%`} />
                <StatCard icon={BarChart3} label="Avg Score" value={`${stats?.avgCompositeScore ?? 0}/5`} sub="composite" />
                <StatCard icon={Award} label="High Perf." value={stats?.highPerformers ?? 0} sub="score ≥ 4.0" />
                <StatCard icon={AlertTriangle} label="Risk Flags" value={(stats?.attendanceBelow70 ?? 0) + (stats?.lowRatingAlerts ?? 0)} sub="needs attention" />
              </>
            )}
          </div>

          {/* Department Overview */}
          {!dashLoading && dash?.departmentStats && dash.departmentStats.length > 0 && (
            <div className="perf-section">
              <div className="perf-section-header">
                <span className="perf-section-title"><Target size={15} style={{ color: PRIMARY_BLUE }} /> Department Overview</span>
              </div>
              <div className="perf-dept-section">
                <div className="perf-dept-bars">
                  {dash.departmentStats.map((dept) => (
                    <DeptBar
                      key={dept.role}
                      label={dept.department}
                      value={dept.count}
                      total={dash.stats?.totalStaff ?? dept.count}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 lg:gap-2 mt-3">
                  {dash.departmentStats.map((dept) => (
                    <div key={dept.role} className="bg-[var(--bg)] rounded-md lg:rounded-lg p-1.5 lg:p-3 border border-[var(--border)] overflow-hidden">
                      <div className="text-[9px] lg:text-[11px] text-[var(--muted)] mb-0.5 lg:mb-1 truncate">{dept.department}</div>
                      <div className="flex flex-col lg:flex-row gap-0.5 lg:gap-3">
                        <div>
                          <div className="text-[10px] lg:text-[14px] font-bold">{dept.avgAttendance}%</div>
                          <div className="text-[7.5px] lg:text-[9px] text-[var(--muted)] truncate">Attend.</div>
                        </div>
                        <div>
                          <div className="text-[10px] lg:text-[14px] font-bold text-[var(--primary)]">{dept.avgCompositeScore}</div>
                          <div className="text-[7.5px] lg:text-[9px] text-[var(--muted)] truncate">Avg Score</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="perf-tabs-container">
            {(["overview", "doctors", "nurses", "staff"] as const).map((tab) => (
              <button
                key={tab}
                className={`perf-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => { setActiveTab(tab); setSelectedEmpId(null); }}
              >
                {tab === "doctors" && <Stethoscope size={12} />}
                {tab === "nurses" && <Heart size={12} />}
                {tab === "staff" && <Briefcase size={12} />}
                {tab === "overview" && <Users size={12} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Top performers for current view */}
          {!isLoading && activeTab === "overview" && dash?.topPerformers && (
            <div className="perf-top-section">
              <div className="perf-top-section-title"><Award size={11} /> Top Performers</div>
              <div className="perf-top-grid">
                {[...dash.topPerformers.doctors.slice(0, 3), ...dash.topPerformers.nurses.slice(0, 2)].map((emp, i) => (
                  <TopPerformerCard key={emp._id} emp={emp} position={i} onSelect={setSelectedEmpId} />
                ))}
              </div>
            </div>
          )}

          {/* Employee list */}
          <div className="perf-section">
            <div className="perf-section-header">
              <span className="perf-section-title"><Activity size={15} style={{ color: PRIMARY_BLUE }} /> Employee Performance</span>
            </div>
            <div className="perf-controls flex justify-between items-center bg-white p-2 md:p-3 rounded-lg border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  className="perf-search w-full md:w-64"
                  placeholder="Search name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="perf-count hidden md:inline-block text-[11px] font-bold text-gray-500">{activeEmployees.length} employee{activeEmployees.length !== 1 ? "s" : ""}</span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium text-gray-500 hidden sm:inline-block">Page {currentPage} of {totalPages || 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors border border-gray-200"
                  >
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                  <button
                    disabled={currentPage >= totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors border border-gray-200"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="perf-emp-list">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="perf-skeleton" style={{ height: 58 }} />
                ))}
              </div>
            ) : activeEmployees.length === 0 ? (
              <div className="perf-empty">
                <div className="perf-empty-icon">📊</div>
                <div className="perf-empty-title">No data for this period</div>
                <div className="perf-empty-sub">Try a different month/year or add attendance records.</div>
              </div>
            ) : (
              <div className="perf-emp-list">
                {paginatedEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp._id}
                    emp={emp}
                    onSelect={setSelectedEmpId}
                    selected={selectedEmpId === emp._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selectedEmp && (
          <EmployeePanel emp={selectedEmp} onClose={() => setSelectedEmpId(null)} />
        )}
      </div>
    </div>
  );
}
