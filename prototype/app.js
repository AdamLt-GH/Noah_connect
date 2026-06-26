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
function renderGrants() {
  const wrap = $("#grants");
  DATA.grants.forEach((g) => {
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
    row.addEventListener("click", () => openGrantDrawer(g));
    wrap.appendChild(row);
  });

  const needing = DATA.grants.filter((g) => NEEDS_ACTION.has(g.state)).length;
  $("#grants-hint").textContent =
    `${DATA.grants.length} grants · ${needing} need attention · click for detail`;
}

/* -------------------- Compliance calendar -------------------- */
function renderCalendar() {
  const wrap = $("#calendar");
  DATA.calendar.forEach((c) => {
    wrap.appendChild(
      el(`<div class="cal-item" data-state="${c.state}">
            <div class="cal-date"><div class="m">${c.month}</div><div class="d">${c.day}</div></div>
            <div class="cal-copy">
              <h4>${c.title}</h4>
              <p>${c.blurb}</p>
              ${chip(c.state)}
            </div>
          </div>`)
    );
  });
}

/* -------------------- Progressive disclosure: drawer -------------------- */
const scrim = $("#scrim");
const drawer = $("#drawer");

function openDrawer({ title, intro, bodyHTML }) {
  $("#drawer-title").textContent = title;
  $("#drawer-intro").textContent = intro || "";
  $("#drawer-body").innerHTML = bodyHTML;
  scrim.classList.add("open");
  drawer.classList.add("open");
  $("#drawer-close").focus();
}
function closeDrawer() {
  scrim.classList.remove("open");
  drawer.classList.remove("open");
}

function openGrantDrawer(g) {
  const cats = g.budgetCategories
    .map((c) => {
      const pct = Math.round((c.spent / c.allocated) * 100);
      const over = c.spent > c.allocated;
      const color = over
        ? "var(--over-budget)"
        : pct >= 85
        ? "var(--at-risk)"
        : "var(--on-track)";
      return `
        <div class="cat">
          <div class="cat-top">
            <b>${c.name}${over ? " ⚠" : ""}</b>
            <span class="nums">${fullMoney(c.spent)} / ${fullMoney(c.allocated)} · ${pct}%</span>
          </div>
          <div class="cat-track"><div class="cat-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div></div>
        </div>`;
    })
    .join("");

  const mstones = g.milestones
    .map((m) => `<div class="mstone"><span>${m.name}</span>${chip(m.status)}</div>`)
    .join("");

  const body = `
    <div class="d-summary">
      <div class="grant-client" style="font-size:13px;color:var(--ink-2)">${g.client} · Due ${g.nextDeadline}</div>
      ${chip(g.state)}
    </div>
    <div class="drawer-sub">Budget by category</div>
    ${cats}
    <div class="drawer-sub">Milestones</div>
    <div class="mstones">${mstones}</div>`;

  openDrawer({ title: g.name, intro: g.flags.join(" · "), bodyHTML: body });
}

/* -------------------- Collapsible sidebar -------------------- */
const app = $(".app");
const railToggle = $("#rail-toggle");

function setCollapsed(collapsed) {
  app.classList.toggle("collapsed", collapsed);
  railToggle.setAttribute("aria-expanded", String(!collapsed));
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  railToggle.setAttribute("aria-label", label);
  railToggle.setAttribute("title", label);
  try { localStorage.setItem("nc-rail-collapsed", collapsed ? "1" : "0"); } catch (e) {}
}

setCollapsed(localStorage.getItem("nc-rail-collapsed") === "1");
railToggle.addEventListener("click", () =>
  setCollapsed(!app.classList.contains("collapsed"))
);

/* -------------------- wire up -------------------- */
scrim.addEventListener("click", closeDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());

renderGrants();
renderCalendar();
