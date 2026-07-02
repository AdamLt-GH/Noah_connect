/* ------------------------------------------------------------------
   Noah Connect — render + interactions
   The dashboard renders from DATA (see data.js) so it holds for any
   values and any number of grants / milestones / budget categories.
   ------------------------------------------------------------------ */

const STATE_LABEL = {
  "on-track": "On track",
  "at-risk": "At risk",
  "over-budget": "Over budget",
  "evidence": "Evidence missing",
  "review": "Needs review",
};
const NEEDS_ACTION = new Set(["at-risk", "over-budget", "evidence", "review"]);

const $ = (sel) => document.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const fullMoney = (n) => "$" + n.toLocaleString();

/* State chip — colour always paired with a dot + label, never alone.
   "on track" uses a quiet variant so it can't compete with problems. */
function chip(state) {
  if (state === "on-track")
    return `<span class="chip quiet"><span class="dot"></span>${STATE_LABEL[state]}</span>`;
  return `<span class="chip" data-state="${state}"><span class="dot"></span>${STATE_LABEL[state]}</span>`;
}

/* -------------------- Grant health overview -------------------- */
function grantRowEl(g) {
  const flags = g.flags.map((f) => `<span>${f}</span>`).join("");
  const row = el(`
    <button class="grant" data-state="${g.state}" type="button">
      <div class="grant-main">
        <div class="grant-name">${g.name}</div>
        <div class="grant-flags">${flags}</div>
        <div class="grant-client">${g.client}</div>
      </div>
      <div class="budget">
        <div class="budget-track"><div class="budget-fill" style="width:${g.budgetUsedPct}%"></div></div>
        <div class="budget-pct"><b>${g.budgetUsedPct}%</b> of budget used</div>
      </div>
      <div class="grant-right">
        ${chip(g.state)}
        <div class="grant-due">Due ${g.nextDeadline}</div>
      </div>
    </button>
  `);
  row.addEventListener("click", () => openProjectView(g));
  return row;
}

function updateGrantsHint() {
  const needing = DATA.grants.filter((g) => NEEDS_ACTION.has(g.state)).length;
  $("#grants-hint").textContent =
    `${DATA.grants.length} grants · ${needing} need attention · click for detail`;
}

function renderGrants() {
  const wrap = $("#grants");
  DATA.grants.forEach((g) => wrap.appendChild(grantRowEl(g)));
  updateGrantsHint();
}

/* -------------------- Sidebar: collapsible client tree -------------------- */
/* Grants are grouped by client. Each client is a collapsible header that
   reveals the list of approved grants beneath it. */
function groupByClient(grants) {
  const map = new Map();
  grants.forEach((g) => {
    if (!map.has(g.client)) map.set(g.client, []);
    map.get(g.client).push(g);
  });
  return map;
}

function clientGroupEl(client, grants) {
  const group = el(`
    <div class="client-group">
      <button class="client-head" type="button" aria-expanded="true" title="${client}">
        <span class="client-chev">▾</span>
        <span class="client-name">${client}</span>
        <span class="client-count">${grants.length}</span>
      </button>
      <div class="client-grants"></div>
    </div>
  `);

  const list = group.querySelector(".client-grants");
  grants.forEach((g) => {
    const item = el(`
      <button class="grant-link" type="button" title="${g.name}">
        <span class="grant-dot" data-state="${g.state}"></span>
        <span class="project-name">${g.name}</span>
      </button>
    `);
    item.addEventListener("click", () => openProjectView(g));
    list.appendChild(item);
  });

  const head = group.querySelector(".client-head");
  head.addEventListener("click", () => {
    const collapsed = group.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", String(!collapsed));
  });

  return group;
}

function renderProjects() {
  const wrap = $("#project-list");
  wrap.innerHTML = "";
  groupByClient(DATA.grants).forEach((grants, client) =>
    wrap.appendChild(clientGroupEl(client, grants))
  );
}

function filterProjects(query) {
  const q = query.trim().toLowerCase();
  $("#project-list")
    .querySelectorAll(".client-group")
    .forEach((grp) => {
      const match = !q || grp.textContent.toLowerCase().includes(q);
      grp.style.display = match ? "" : "none";
    });
}

/* -------------------- Compliance calendar -------------------- */
function calItemEl(c) {
  return el(`<div class="cal-item" data-state="${c.state}">
        <div class="cal-date"><div class="m">${c.month}</div><div class="d">${c.day}</div></div>
        <div class="cal-copy">
          <h4>${c.title}</h4>
          <p>${c.blurb}</p>
          ${chip(c.state)}
        </div>
      </div>`);
}

function renderCalendar() {
  const wrap = $("#calendar");
  DATA.calendar.forEach((c) => wrap.appendChild(calItemEl(c)));
}

/* -------------------- Project view: summary bar + milestone Gantt -------------------- */
const dashboardView = $("#dashboard-view");
const projectView = $("#project-view");
const DAY_MS = 24 * 60 * 60 * 1000;
const GANTT_COLORS = ["#2f6df0", "#c77a14", "#e8471a", "#1f9d6b", "#7b54d6"];
const GANTT_BASE_WIDTH = 860; // px — the width that fits the panel at zoom level 1
const GANTT_END_PAD = 90; // px of breathing room for the trailing due-date label
const GANTT_MIN_ZOOM = 1;
const GANTT_MAX_ZOOM = 8;

function parseISODate(iso) {
  return ISO_DATE.test(iso || "") ? new Date(iso + "T00:00:00") : null;
}

function formatMonthYear(date) {
  return date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

/* Pick a month step (1/2/3/6/12/24/36) so ticks stay at least ~90px apart —
   the more we zoom in (wider track), the finer the step gets. */
function ganttMonthStep(totalDays, trackWidth) {
  const approxMonths = Math.max(totalDays / 30.44, 1);
  const steps = [1, 2, 3, 6, 12, 24, 36];
  for (const step of steps) {
    const pxPerLabel = trackWidth / (approxMonths / step);
    if (pxPerLabel >= 90) return step;
  }
  return steps[steps.length - 1];
}

function renderSummary(g) {
  const wrap = $("#summary-bar");
  const period =
    g.projectStartDate && g.projectEndDate
      ? `${fmtDate(g.projectStartDate)} – ${fmtDate(g.projectEndDate)}`
      : "—";
  wrap.innerHTML = `
    <div class="summary-stat">
      <span class="summary-label">Total project cost</span>
      <span class="summary-value">${g.totalProjectCost != null ? fullMoney(g.totalProjectCost) : "—"}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Grant amount</span>
      <span class="summary-value">${g.maximumFunds != null ? fullMoney(g.maximumFunds) : "—"}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Project period</span>
      <span class="summary-value">${period}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Milestones</span>
      <span class="summary-value">${(g.milestones || []).length}</span>
    </div>`;
}

/* ----- hover tooltip: "View activities" / "View outcomes" links ----- */
const ganttTooltip = $("#gantt-tooltip");
const ganttTooltipActivities = $("#gantt-tooltip-activities");
const ganttTooltipOutcomes = $("#gantt-tooltip-outcomes");
let ganttTooltipHideTimer = null;

function showGanttTooltip(bar, milestoneNumber) {
  clearTimeout(ganttTooltipHideTimer);
  ganttTooltipActivities.href = `activities.html?milestone=${encodeURIComponent(milestoneNumber)}`;
  ganttTooltipOutcomes.href = `outcomes.html?milestone=${encodeURIComponent(milestoneNumber)}`;
  const rect = bar.getBoundingClientRect();
  ganttTooltip.hidden = false;
  ganttTooltip.style.left = `${rect.left}px`;
  ganttTooltip.style.top = `${rect.bottom + 8}px`;
}
function scheduleHideGanttTooltip() {
  ganttTooltipHideTimer = setTimeout(() => { ganttTooltip.hidden = true; }, 150);
}
ganttTooltip.addEventListener("mouseenter", () => clearTimeout(ganttTooltipHideTimer));
ganttTooltip.addEventListener("mouseleave", scheduleHideGanttTooltip);

/* ----- Gantt chart: month/year axis + zoomable, scrollable bars ----- */
let ganttGrant = null;
let ganttZoom = GANTT_MIN_ZOOM;

function renderGantt(g) {
  ganttGrant = g;
  const wrap = $("#gantt");
  wrap.innerHTML = "";

  const ranged = (g.milestones || [])
    .map((m) => ({ ...m, _start: parseISODate(m.start), _end: parseISODate(m.end) }))
    .filter((m) => m._start && m._end);

  const bounds = [
    parseISODate(g.projectStartDate),
    parseISODate(g.projectEndDate),
    ...ranged.map((m) => m._start),
    ...ranged.map((m) => m._end),
  ].filter(Boolean);

  if (!bounds.length) {
    wrap.innerHTML = `<p class="gantt-empty">No milestone dates to plot yet.</p>`;
    return;
  }

  const rangeStart = Math.min(...bounds.map((d) => d.getTime()));
  const rangeEnd = Math.max(...bounds.map((d) => d.getTime()));
  const totalMs = Math.max(rangeEnd - rangeStart, DAY_MS);
  const totalDays = totalMs / DAY_MS;

  const trackWidth = GANTT_BASE_WIDTH * ganttZoom;
  const innerWidth = trackWidth + GANTT_END_PAD;
  const monthStep = ganttMonthStep(totalDays, trackWidth);

  /* Axis row — month/year ticks spaced proportionally to calendar time. */
  const axisRow = el(`
    <div class="gantt-row gantt-axis-row">
      <div class="gantt-label gantt-axis-spacer"></div>
      <div class="gantt-track" style="width:${innerWidth}px"></div>
    </div>`);
  const axisTrack = axisRow.querySelector(".gantt-track");

  const tick = new Date(rangeStart);
  tick.setDate(1);
  tick.setHours(0, 0, 0, 0);
  while (tick.getTime() <= rangeEnd) {
    const left = ((tick.getTime() - rangeStart) / totalMs) * trackWidth;
    if (left >= -2) {
      axisTrack.appendChild(el(`<div class="gantt-tick" style="left:${left}px">${formatMonthYear(tick)}</div>`));
    }
    tick.setMonth(tick.getMonth() + monthStep);
  }
  wrap.appendChild(axisRow);

  /* One row per milestone. */
  ranged.forEach((m, i) => {
    const left = ((m._start.getTime() - rangeStart) / totalMs) * trackWidth;
    const width = Math.max(((m._end.getTime() - m._start.getTime()) / totalMs) * trackWidth, 8);
    const color = GANTT_COLORS[i % GANTT_COLORS.length];
    const label = `M${m.number} — ${m.title}`;

    const row = el(`
      <div class="gantt-row">
        <div class="gantt-label" title="${label}">${label}</div>
        <div class="gantt-track" style="width:${innerWidth}px">
          <div class="gantt-bar" style="left:${left}px;width:${width}px;background:${color}"></div>
          <div class="gantt-due" style="left:${left + width + 8}px">${fmtDate(m.end)}</div>
        </div>
      </div>`);

    const bar = row.querySelector(".gantt-bar");
    bar.addEventListener("mouseenter", () => showGanttTooltip(bar, m.number));
    bar.addEventListener("mouseleave", scheduleHideGanttTooltip);

    wrap.appendChild(row);
  });
}

function setGanttZoom(next) {
  ganttZoom = Math.min(GANTT_MAX_ZOOM, Math.max(GANTT_MIN_ZOOM, next));
  if (ganttGrant) renderGantt(ganttGrant);
}

$("#gantt-zoom-in").addEventListener("click", () => setGanttZoom(ganttZoom * 1.6));
$("#gantt-zoom-out").addEventListener("click", () => setGanttZoom(ganttZoom / 1.6));

function openProjectView(g) {
  $("#pv-client").textContent = g.client;
  $("#pv-name").textContent = g.name;
  ganttZoom = GANTT_MIN_ZOOM;
  renderSummary(g);
  renderGantt(g);
  dashboardView.hidden = true;
  projectView.hidden = false;
}

function closeProjectView() {
  projectView.hidden = true;
  dashboardView.hidden = false;
  ganttTooltip.hidden = true;
}

$("#project-back").addEventListener("click", closeProjectView);

/* -------------------- Project search -------------------- */
$("#project-search").addEventListener("input", (e) => filterProjects(e.target.value));

/* ==================================================================
   Add-project modal — upload a PDF, extract via the backend, and graft
   the result into the sidebar, grant overview, and compliance calendar.
   ================================================================== */
const EXTRACT_URL = "http://localhost:8000/extract";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const modalScrim = $("#modal-scrim");
const modal = $("#add-modal");
const uploadZone = $("#upload-zone");
const modalFile = $("#modal-file");
const modalLoading = $("#modal-loading");
const modalError = $("#modal-error");

function fmtDate(iso) {
  if (!ISO_DATE.test(iso || "")) return iso || "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}
function isoToCal(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    month: d.toLocaleString("en-AU", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}

/* ----- modal state machine: 'upload' | 'loading' | 'error' ----- */
function setModalState(state) {
  uploadZone.hidden = state !== "upload";
  modalLoading.hidden = state !== "loading";
  modalError.hidden = state !== "error";
}
function openModal() {
  modalFile.value = "";
  setModalState("upload");
  modalScrim.classList.add("open");
  modal.classList.add("open");
}
function closeModal() {
  modalScrim.classList.remove("open");
  modal.classList.remove("open");
}
function showModalError(message) {
  $("#modal-error-msg").textContent = message;
  setModalState("error");
}

/* ----- map extracted JSON -> a DATA.grants-shaped object ----- */
function grantFromExtract(x) {
  const reports = (x.reports || []).filter((r) => ISO_DATE.test(r.due_date || ""));
  const firstDue = reports.length ? reports[0].due_date : null;

  const budgetCategories = (x.budget || [])
    .filter((b) => !b.is_total)
    .map((b) => ({
      name: b.category,
      allocated: b.total != null ? b.total : (b.year1 || 0) + (b.year2 || 0),
      spent: 0,
    }));

  // The agreement only gives each milestone a due date, not a start date, so
  // we chain them: a milestone starts where the previous one ended (the first
  // starts at the project start date).
  let prevEnd = ISO_DATE.test(x.project_start_date || "") ? x.project_start_date : null;
  const milestones = (x.milestones || [])
    .slice()
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .map((m) => {
      const end = ISO_DATE.test(m.planned_achievement_date || "") ? m.planned_achievement_date : null;
      const start = prevEnd;
      if (end) prevEnd = end;
      return {
        number: m.number,
        title: m.title,
        status: "on-track",
        start,
        end,
      };
    });

  const recipient = (x.recipient && x.recipient.name) || null;
  const totalRow = (x.budget || []).find((b) => b.is_total);

  return {
    name: x.project_title || recipient || "New grant",
    sidebarName: recipient || x.project_title || "New project",
    client: recipient || "",
    state: "on-track",
    budgetUsedPct: 0,
    nextDeadline: firstDue ? fmtDate(firstDue) : "TBA",
    flags: [
      x.project_reference_number ? `Ref ${x.project_reference_number}` : "New project",
    ],
    projectStartDate: x.project_start_date || null,
    projectEndDate: x.project_end_date || null,
    maximumFunds: x.maximum_funds ?? null,
    totalProjectCost: totalRow ? (totalRow.total ?? (totalRow.year1 || 0) + (totalRow.year2 || 0)) : null,
    budgetCategories,
    milestones,
    _reports: reports,
  };
}

/* ----- session persistence -----
   Grants added via PDF upload only live in memory, so navigating to
   activities.html/outcomes.html and back (a real page load) would normally
   wipe them. We stash just the uploaded grants/calendar entries (not the
   seed placeholders already in data.js) in sessionStorage — scoped to this
   browser tab's session, cleared when the tab closes. */
const SESSION_KEY = "noahConnectUploads";
let uploadedGrants = [];
let uploadedCalendarEntries = [];

function persistUploads() {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ grants: uploadedGrants, calendar: uploadedCalendarEntries })
    );
  } catch (e) { /* storage unavailable — uploads just won't survive a reload */ }
}

function restoreUploads() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    uploadedGrants = Array.isArray(saved.grants) ? saved.grants : [];
    uploadedCalendarEntries = Array.isArray(saved.calendar) ? saved.calendar : [];
    DATA.grants.push(...uploadedGrants);
    DATA.calendar.push(...uploadedCalendarEntries);
  } catch (e) { /* ignore corrupt session data */ }
}

function addExtractedGrant(x) {
  const g = grantFromExtract(x);
  uploadedGrants.push(g);

  // Centre panel — grant health overview.
  DATA.grants.push(g);
  $("#grants").appendChild(grantRowEl(g));
  updateGrantsHint();

  // Sidebar — rebuild the client tree so the new grant lands under its
  // client (recipient name), creating a new client group if needed.
  renderProjects();

  // Right panel — compliance calendar (one entry per dated report).
  g._reports.forEach((r) => {
    const { month, day } = isoToCal(r.due_date);
    const period =
      ISO_DATE.test(r.period_start_date || "") && ISO_DATE.test(r.period_end_date || "")
        ? `${fmtDate(r.period_start_date)} – ${fmtDate(r.period_end_date)}`
        : `Due ${fmtDate(r.due_date)}`;
    const c = {
      month,
      day,
      title: `${r.report_type}${g.client ? " · " + g.client : ""}`,
      blurb: period,
      state: "on-track",
    };
    uploadedCalendarEntries.push(c);
    DATA.calendar.push(c);
    $("#calendar").appendChild(calItemEl(c));
  });

  persistUploads();
}

/* ----- upload handling ----- */
async function uploadPdf(file) {
  setModalState("loading");
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(EXTRACT_URL, { method: "POST", body: form });
    if (!res.ok) {
      let detail = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body.detail) detail = body.detail;
      } catch (e) { /* ignore */ }
      throw new Error(detail);
    }
    const data = await res.json();
    addExtractedGrant(data);
    closeModal();
  } catch (err) {
    showModalError(
      err.message === "Failed to fetch"
        ? "Could not reach the server. Is the backend running on port 8000?"
        : err.message
    );
  }
}

function handleModalFile(files) {
  const file = files && files[0];
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showModalError("Please select a PDF file.");
    return;
  }
  uploadPdf(file);
}

/* ----- modal wiring ----- */
$("#add-project").addEventListener("click", openModal);
$("#modal-close").addEventListener("click", closeModal);
modalScrim.addEventListener("click", closeModal);
$("#modal-retry").addEventListener("click", () => setModalState("upload"));

uploadZone.addEventListener("click", () => modalFile.click());
uploadZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    modalFile.click();
  }
});
modalFile.addEventListener("change", (e) => handleModalFile(e.target.files));
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragging");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragging"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragging");
  handleModalFile(e.dataTransfer.files);
});

/* -------------------- wire up -------------------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    if (!projectView.hidden) closeProjectView();
  }
});

restoreUploads();
renderGrants();
renderProjects();
renderCalendar();

