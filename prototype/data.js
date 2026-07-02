
/* ------------------------------------------------------------------
   Noah Connect — placeholder data
   ------------------------------------------------------------------
   All figures here are PLACEHOLDERS. The dashboard renders entirely
   from this object, so the layout holds for any number of clients,
   grants, milestones or budget categories.

   Colour tagging is deliberately minimal — three states only:
     on-track    — spend aligned, no action
     at-risk     — approaching a limit or deadline; watch
     over-budget — spend exceeds an allocated category/budget

   Grants are grouped in the sidebar by client.
   ------------------------------------------------------------------ */

const DATA = {
  syncedAt: "Today, 9:15 AM",

  /* Grant health overview — prioritised by risk, then deadline. */
  grants: [
    {
      name: "Low-VOC Paint Line",
      client: "Deluxe Paints",
      budgetUsedPct: 95,
      state: "over-budget",
      nextDeadline: "30 Jun 2026",
      flags: ["Plant spend over budget", "Invoice evidence missing"],
      budgetCategories: [
        { name: "Plant & Equipment", allocated: 20_000, spent: 23_400 },
        { name: "Labour", allocated: 60_000, spent: 55_100 },
        { name: "Operations", allocated: 20_000, spent: 16_800 },
      ],
      milestones: [
        { name: "Milestone 1 — Formulation", status: "on-track" },
        { name: "Milestone 2 — Pilot batch", status: "at-risk" },
        { name: "Milestone 3 — Acquittal", status: "at-risk" },
      ],
    },
    {
      name: "Satellite Comms Module",
      client: "Spacetech",
      budgetUsedPct: 84,
      state: "at-risk",
      nextDeadline: "8 Jul 2026",
      flags: ["2 transactions need matching"],
      budgetCategories: [
        { name: "Engineering", allocated: 90_000, spent: 78_000 },
        { name: "Components", allocated: 10_000, spent: 7_900 },
      ],
      milestones: [
        { name: "Milestone 1 — Design", status: "on-track" },
        { name: "Milestone 2 — Integration", status: "at-risk" },
      ],
    },
    {
      name: "Reusable Propulsion Rig",
      client: "Spacetech",
      budgetUsedPct: 38,
      state: "at-risk",
      nextDeadline: "31 Jul 2026",
      flags: ["Underspend risk before acquittal"],
      budgetCategories: [
        { name: "Test Facility", allocated: 70_000, spent: 24_000 },
        { name: "Materials", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { name: "Milestone 1 — Build", status: "on-track" },
        { name: "Milestone 2 — Test firing", status: "at-risk" },
      ],
    },
    {
      name: "Autonomous Drone Platform",
      client: "Aquila",
      budgetUsedPct: 72,
      state: "on-track",
      nextDeadline: "12 Jul 2026",
      flags: ["Milestone 2 on track"],
      budgetCategories: [
        { name: "Software", allocated: 120_000, spent: 84_000 },
        { name: "Hardware", allocated: 30_000, spent: 22_000 },
        { name: "Field Trials", allocated: 25_000, spent: 19_000 },
        { name: "Operations", allocated: 15_000, spent: 11_500 },
      ],
      milestones: [
        { name: "Milestone 1 — Prototype", status: "on-track" },
        { name: "Milestone 2 — Field trial", status: "on-track" },
        { name: "Milestone 3 — Certification", status: "on-track" },
      ],
    },
    {
      name: "Recycled Pigment Process",
      client: "Deluxe Paints",
      budgetUsedPct: 55,
      state: "on-track",
      nextDeadline: "28 Aug 2026",
      flags: ["All required invoices uploaded"],
      budgetCategories: [
        { name: "R&D Labour", allocated: 40_000, spent: 24_000 },
        { name: "Materials", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { name: "Milestone 1 — Lab validation", status: "on-track" },
        { name: "Milestone 2 — Scale-up", status: "on-track" },
      ],
    },
  ],

  /* Compliance calendar — upcoming reports, evidence + acquittals. */
  calendar: [
    {
      month: "Jun",
      day: "30",
      title: "Low-VOC Paint Line report due",
      blurb: "Plant spend above budget and evidence incomplete.",
      state: "over-budget",
    },
    {
      month: "Jul",
      day: "05",
      title: "Evidence required — Deluxe Paints",
      blurb: "Missing receipts for this reporting period.",
      state: "at-risk",
    },
    {
      month: "Jul",
      day: "08",
      title: "Satellite Comms Module report due",
      blurb: "Two Xero transactions still need matching.",
      state: "at-risk",
    },
    {
      month: "Jul",
      day: "12",
      title: "Autonomous Drone Platform milestone review",
      blurb: "Milestone 2 financial target is on track.",
      state: "on-track",
    },
    {
      month: "Jul",
      day: "31",
      title: "Reusable Propulsion Rig final acquittal",
      blurb: "Potential underspend before final reporting.",
      state: "at-risk",
    },
  ],
};
