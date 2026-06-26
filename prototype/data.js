/* ------------------------------------------------------------------
   Noah Connect — placeholder data
   ------------------------------------------------------------------
   All figures here are PLACEHOLDERS. The real grant data isn't
   available yet. The dashboard renders entirely from this object, so
   the layout and hierarchy hold for any reasonable values and for any
   number of grants, milestones or budget categories.

   States (the only colours that carry meaning):
     on-track   — spend aligned, evidence complete, no action
     at-risk    — approaching a limit or deadline; watch
     over-budget— spend exceeds an allocated category/budget
     evidence   — required documents missing
     review     — Xero transactions awaiting allocation
   ------------------------------------------------------------------ */

const DATA = {
  syncedAt: "Today, 9:15 AM",

  /* Grant health overview — prioritised by risk, then deadline.
     budgetUsedPct drives the bar. flags are plain-language reasons.
     budgetCategories + milestones can be any length. */
  grants: [
    {
      name: "Community Support Grant",
      client: "Client B",
      budgetUsedPct: 95,
      state: "over-budget",
      nextDeadline: "30 Jun 2026",
      flags: ["Equipment category overspent", "Evidence missing"],
      budgetCategories: [
        { name: "Equipment", allocated: 20_000, spent: 23_400 },
        { name: "Wages", allocated: 60_000, spent: 55_100 },
        { name: "Operations", allocated: 20_000, spent: 16_800 },
      ],
      milestones: [
        { name: "Milestone 1 — Setup", status: "on-track" },
        { name: "Milestone 2 — Delivery", status: "at-risk" },
        { name: "Milestone 3 — Acquittal", status: "at-risk" },
      ],
    },
    {
      name: "Settlement Support Grant",
      client: "Client E",
      budgetUsedPct: 84,
      state: "at-risk",
      nextDeadline: "8 Jul 2026",
      flags: ["2 transactions need matching"],
      budgetCategories: [
        { name: "Casework", allocated: 90_000, spent: 78_000 },
        { name: "Travel", allocated: 10_000, spent: 7_900 },
      ],
      milestones: [
        { name: "Milestone 1 — Intake", status: "on-track" },
        { name: "Milestone 2 — Support", status: "at-risk" },
      ],
    },
    {
      name: "Youth Employment Grant",
      client: "Client A",
      budgetUsedPct: 72,
      state: "on-track",
      nextDeadline: "12 Jul 2026",
      flags: ["Milestone 2 on track"],
      budgetCategories: [
        { name: "Wages", allocated: 120_000, spent: 84_000 },
        { name: "Equipment", allocated: 30_000, spent: 22_000 },
        { name: "Training", allocated: 25_000, spent: 19_000 },
        { name: "Operations", allocated: 15_000, spent: 11_500 },
      ],
      milestones: [
        { name: "Milestone 1 — Recruitment", status: "on-track" },
        { name: "Milestone 2 — Placement", status: "on-track" },
        { name: "Milestone 3 — Retention", status: "on-track" },
      ],
    },
    {
      name: "Digital Inclusion Grant",
      client: "Client D",
      budgetUsedPct: 55,
      state: "on-track",
      nextDeadline: "28 Aug 2026",
      flags: ["All required invoices uploaded"],
      budgetCategories: [
        { name: "Devices", allocated: 40_000, spent: 24_000 },
        { name: "Connectivity", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { name: "Milestone 1 — Rollout", status: "on-track" },
        { name: "Milestone 2 — Training", status: "on-track" },
      ],
    },
    {
      name: "Skills Training Grant",
      client: "Client C",
      budgetUsedPct: 38,
      state: "at-risk",
      nextDeadline: "31 Jul 2026",
      flags: ["Underspend risk before acquittal"],
      budgetCategories: [
        { name: "Trainers", allocated: 70_000, spent: 24_000 },
        { name: "Materials", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { name: "Milestone 1 — Curriculum", status: "on-track" },
        { name: "Milestone 2 — Delivery", status: "at-risk" },
      ],
    },
  ],

  /* Compliance calendar — upcoming reports, evidence + acquittals. */
  calendar: [
    {
      month: "Jun",
      day: "30",
      title: "Community Support report due",
      blurb: "Equipment spend above budget and evidence incomplete.",
      state: "over-budget",
    },
    {
      month: "Jul",
      day: "05",
      title: "Evidence required — Client B",
      blurb: "Missing receipts and activity evidence for this period.",
      state: "evidence",
    },
    {
      month: "Jul",
      day: "08",
      title: "Settlement Support report due",
      blurb: "Two Xero transactions still need matching.",
      state: "at-risk",
    },
    {
      month: "Jul",
      day: "12",
      title: "Youth Employment milestone review",
      blurb: "Milestone 2 financial target is on track.",
      state: "on-track",
    },
    {
      month: "Jul",
      day: "31",
      title: "Skills Training final acquittal",
      blurb: "Potential underspend before final reporting.",
      state: "at-risk",
    },
  ],
};
