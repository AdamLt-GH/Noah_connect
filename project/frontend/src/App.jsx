import { useCallback, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = "http://localhost:8000/extract";

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatAUD(value) {
  if (value === null || value === undefined) return "—";
  return audFormatter.format(value);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso; // descriptive text, not a date
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/* Upload screen                                                       */
/* ------------------------------------------------------------------ */

function UploadScreen({ onExtract, loading, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      const file = files && files[0];
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        onExtract(null, "Please select a PDF file.");
        return;
      }
      onExtract(file);
    },
    [onExtract]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-lg shadow-blue-200">
            AC
          </div>
          <h1 className="text-3xl font-bold text-slate-800">
            AC Grant Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Extract and visualise any Accelerating Commercialisation grant
            agreement.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border-2 border-blue-200 bg-white p-12 shadow-sm">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-lg font-medium text-slate-700">
              Extracting grant data...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Reading schedules and milestones from your PDF.
            </p>
          </div>
        ) : (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-colors ${
                dragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <svg
                className="mx-auto mb-4 h-12 w-12 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-lg font-medium text-slate-700">
                Upload your AC grant agreement PDF
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Drag &amp; drop here, or click to browse
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
                <p className="font-medium text-red-700">Extraction failed</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard building blocks                                           */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }) {
  return (
    <h2 className="mb-4 text-lg font-semibold text-slate-800">{children}</h2>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/* Section 1 — Grant header ----------------------------------------- */

function GrantHeader({ data }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              Recipient
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {data.recipient?.name || "—"}
            </h1>
            <p className="mt-1 text-blue-100">
              ABN {data.recipient?.abn || "—"}
            </p>
          </div>
          {data.grant_percentage !== null &&
            data.grant_percentage !== undefined && (
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                {data.grant_percentage}% grant
              </span>
            )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Project
            </p>
            <p className="mt-1 font-semibold leading-snug">
              {data.project_title || "—"}
            </p>
            <p className="mt-0.5 text-sm text-blue-100">
              Ref {data.project_reference_number || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Project dates
            </p>
            <p className="mt-1 font-semibold">
              {formatDate(data.project_start_date)}
            </p>
            <p className="text-sm text-blue-100">
              to {formatDate(data.project_end_date)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Maximum funds
            </p>
            <p className="mt-1 text-2xl font-bold sm:text-3xl">
              {formatAUD(data.maximum_funds)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* Section 2 — Milestones tracker ----------------------------------- */

const STATUSES = ["Not started", "In progress", "Complete"];
const STATUS_STYLES = {
  "Not started": "bg-slate-100 text-slate-600 hover:bg-slate-200",
  "In progress": "bg-amber-100 text-amber-700 hover:bg-amber-200",
  Complete: "bg-green-100 text-green-700 hover:bg-green-200",
};

function Milestones({ milestones, statuses, onCycle }) {
  const sorted = useMemo(() => {
    return milestones
      .map((m, i) => ({ ...m, _index: i }))
      .sort((a, b) => {
        if (!a.planned_achievement_date) return 1;
        if (!b.planned_achievement_date) return -1;
        return a.planned_achievement_date.localeCompare(
          b.planned_achievement_date
        );
      });
  }, [milestones]);

  const completeCount = statuses.filter((s) => s === "Complete").length;
  const total = milestones.length;
  const pct = total ? Math.round((completeCount / total) * 100) : 0;

  return (
    <div>
      <SectionTitle>Milestones</SectionTitle>
      <Card className="mb-5 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {completeCount} of {total} milestones complete
          </span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sorted.map((m) => {
          const status = statuses[m._index];
          return (
            <Card key={m._index} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {m.number}
                  </span>
                  <h3 className="mt-2 font-semibold leading-snug text-slate-800">
                    {m.title}
                  </h3>
                </div>
                <button
                  onClick={() => onCycle(m._index)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${STATUS_STYLES[status]}`}
                  title="Click to change status"
                >
                  {status}
                </button>
              </div>

              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Due {formatDate(m.planned_achievement_date)}
              </p>

              {m.activities?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Activities
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {m.activities.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {m.measurable_outcomes?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Measurable outcomes
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {m.measurable_outcomes.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* Section 3 — Budget overview -------------------------------------- */

const BAR_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#1d4ed8",
  "#93c5fd",
  "#1e40af",
  "#38bdf8",
];

function Budget({ budget }) {
  const rows = budget || [];
  const chartData = rows
    .filter((r) => !r.is_total)
    .map((r) => ({
      name: r.category.replace(/\s*Expenditure$/i, ""),
      total: r.total ?? (r.year1 || 0) + (r.year2 || 0),
    }));

  return (
    <div>
      <SectionTitle>Budget overview</SectionTitle>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Year 1</th>
                <th className="px-5 py-3 text-right font-medium">Year 2</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-b border-slate-100 last:border-0 ${
                    r.is_total ? "bg-blue-50 font-bold text-slate-800" : "text-slate-600"
                  }`}
                >
                  <td className="px-5 py-3">{r.category}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatAUD(r.year1)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatAUD(r.year2)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatAUD(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {chartData.length > 0 && (
          <div className="border-t border-slate-100 p-5">
            <p className="mb-4 text-sm font-medium text-slate-600">
              Total spend by category
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatAUD(value), "Total"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* Section 4 — Reporting calendar ----------------------------------- */

function reportStatus(report, completed) {
  if (completed) {
    return { label: "Completed", dot: "bg-green-500", chip: "bg-green-100 text-green-700", border: "border-green-200" };
  }
  if (isIsoDate(report.due_date)) {
    const days = daysUntil(report.due_date);
    if (days < 0) {
      return { label: "Overdue", dot: "bg-red-500", chip: "bg-red-100 text-red-700", border: "border-red-200" };
    }
    if (days <= 30) {
      return { label: "Due soon", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", border: "border-amber-200" };
    }
    return { label: "Upcoming", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", border: "border-blue-200" };
  }
  return { label: "On request", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", border: "border-slate-200" };
}

function Reports({ reports, completedSet, onToggle }) {
  return (
    <div>
      <SectionTitle>Reporting calendar</SectionTitle>
      <Card className="p-5">
        <ol className="relative ml-2 border-l-2 border-slate-100">
          {reports.map((r, i) => {
            const completed = completedSet.has(i);
            const s = reportStatus(r, completed);
            const period =
              isIsoDate(r.period_start_date) || isIsoDate(r.period_end_date)
                ? `${formatDate(r.period_start_date)} – ${formatDate(r.period_end_date)}`
                : "To be advised";
            return (
              <li key={i} className="mb-5 ml-5 last:mb-0">
                <span
                  className={`absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-white ${s.dot}`}
                />
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border ${s.border} bg-white p-3`}
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {r.report_type}
                    </p>
                    <p className="text-sm text-slate-500">
                      Due{" "}
                      {isIsoDate(r.due_date) ? formatDate(r.due_date) : r.due_date}
                    </p>
                    <p className="text-xs text-slate-400">Period: {period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${s.chip}`}
                    >
                      {s.label}
                    </span>
                    <button
                      onClick={() => onToggle(i)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                      title="Toggle completed"
                    >
                      {completed ? "Undo" : "Mark done"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

/* Section 5 — Key financials --------------------------------------- */

function KeyFinancials({ data }) {
  return (
    <div>
      <SectionTitle>Key financials</SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">
            Initial progress payment
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatAUD(data.initial_progress_payment)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Retention amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatAUD(data.retention_amount)}
          </p>
        </Card>
        <Card className="overflow-hidden p-5">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Annual capped amounts
          </p>
          <table className="w-full text-sm">
            <tbody>
              {(data.annual_capped_amounts || []).map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-600">{row.financial_year}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-slate-800">
                    {formatAUD(row.capped_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ data, onReset }) {
  const [statuses, setStatuses] = useState(() =>
    (data.milestones || []).map(() => "Not started")
  );
  const [completedReports, setCompletedReports] = useState(() => new Set());

  const cycleStatus = (index) => {
    setStatuses((prev) => {
      const next = [...prev];
      const cur = STATUSES.indexOf(next[index]);
      next[index] = STATUSES[(cur + 1) % STATUSES.length];
      return next;
    });
  };

  const toggleReport = (index) => {
    setCompletedReports((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              AC
            </div>
            <span className="font-semibold text-slate-800">Grant Dashboard</span>
          </div>
          <button
            onClick={onReset}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        <GrantHeader data={data} />
        {data.project_outcomes && (
          <Card className="p-5">
            <SectionTitle>Project outcomes</SectionTitle>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {data.project_outcomes}
            </p>
          </Card>
        )}
        <Milestones
          milestones={data.milestones || []}
          statuses={statuses}
          onCycle={cycleStatus}
        />
        <Budget budget={data.budget} />
        <Reports
          reports={data.reports || []}
          completedSet={completedReports}
          onToggle={toggleReport}
        />
        <KeyFinancials data={data} />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App root                                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExtract = useCallback(async (file, validationError) => {
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          if (body.detail) detail = body.detail;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(detail);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not reach the server. Is the backend running on port 8000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  if (data) {
    return <Dashboard data={data} onReset={reset} />;
  }
  return (
    <UploadScreen onExtract={handleExtract} loading={loading} error={error} />
  );
}
