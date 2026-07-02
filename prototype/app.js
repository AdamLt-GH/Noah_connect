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

/* -------------------- Project view: milestone Gantt chart -------------------- */
const dashboardView = $("#dashboard-view");
const projectView = $("#project-view");
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const GANTT_COLORS = ["#2f6df0", "#c77a14", "#e8471a", "#1f9d6b", "#7b54d6"];

function parseISODate(iso) {
  return ISO_DATE.test(iso || "") ? new Date(iso + "T00:00:00") : null;
}

function renderGantt(g) {
  const wrap = $("#gantt");
  wrap.innerHTML = "";

  const ranged = (g.milestones || [])
    .map((m) => ({ ...m, _start: parseISODate(m.start), _end: parseISODate(m.end) }))
    .filter((m) => m._start && m._end);

  if (!ranged.length) {
    wrap.innerHTML = `<p class="gantt-empty">No milestone dates to plot yet.</p>`;
    return;
  }

  const rangeStart = Math.min(...ranged.map((m) => m._start.getTime()));
  const rangeEnd = Math.max(...ranged.map((m) => m._end.getTime()));
  const totalWeeks = Math.max(1, Math.ceil((rangeEnd - rangeStart) / WEEK_MS));
  const cols = `repeat(${totalWeeks}, 1fr)`;

  const header = el(`
    <div class="gantt-row gantt-header">
      <div class="gantt-label"></div>
      <div class="gantt-track" style="grid-template-columns:${cols}"></div>
    </div>`);
  const headerTrack = header.querySelector(".gantt-track");
  for (let w = 0; w < totalWeeks; w++) {
    headerTrack.appendChild(el(`<div class="gantt-week">W${w + 1}</div>`));
  }
  wrap.appendChild(header);

  ranged.forEach((m, i) => {
    const startWeek = Math.floor((m._start.getTime() - rangeStart) / WEEK_MS);
    const endWeek = Math.max(startWeek + 1, Math.ceil((m._end.getTime() - rangeStart) / WEEK_MS));
    const row = el(`
      <div class="gantt-row">
        <div class="gantt-label">${m.name}</div>
        <div class="gantt-track" style="grid-template-columns:${cols}">
          <div class="gantt-bar" style="grid-column:${startWeek + 1} / ${endWeek + 1};background:${GANTT_COLORS[i % GANTT_COLORS.length]}"></div>
        </div>
      </div>`);
    wrap.appendChild(row);
  });
}

function openProjectView(g) {
  $("#pv-client").textContent = g.client;
  $("#pv-name").textContent = g.name;
  renderGantt(g);
  dashboardView.hidden = true;
  projectView.hidden = false;
}

function closeProjectView() {
  projectView.hidden = true;
  dashboardView.hidden = false;
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
        name: `Milestone ${m.number} — ${m.title}`,
        status: "on-track",
        start,
        end,
      };
    });

  const recipient = (x.recipient && x.recipient.name) || null;

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
    budgetCategories,
    milestones,
    _reports: reports,
  };
}

function addExtractedGrant(x) {
  const g = grantFromExtract(x);

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
    DATA.calendar.push(c);
    $("#calendar").appendChild(calItemEl(c));
  });
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

renderGrants();
renderProjects();
renderCalendar();
