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
      projectStartDate: "2025-12-01",
      projectEndDate: "2026-06-30",
      maximumFunds: 50_000,
      totalProjectCost: 100_000,
      budgetCategories: [
        { name: "Plant & Equipment", allocated: 20_000, spent: 23_400 },
        { name: "Labour", allocated: 60_000, spent: 55_100 },
        { name: "Operations", allocated: 20_000, spent: 16_800 },
      ],
      milestones: [
        { number: 1, title: "Formulation", status: "on-track", start: "2026-01-05", end: "2026-02-20" },
        { number: 2, title: "Pilot batch", status: "at-risk", start: "2026-02-20", end: "2026-04-15" },
        { number: 3, title: "Acquittal", status: "at-risk", start: "2026-04-15", end: "2026-06-30" },
      ],
    },
    {
      name: "Satellite Comms Module",
      client: "Spacetech",
      budgetUsedPct: 84,
      state: "at-risk",
      nextDeadline: "8 Jul 2026",
      flags: ["2 transactions need matching"],
      projectStartDate: "2026-01-15",
      projectEndDate: "2026-07-08",
      maximumFunds: 50_000,
      totalProjectCost: 100_000,
      budgetCategories: [
        { name: "Engineering", allocated: 90_000, spent: 78_000 },
        { name: "Components", allocated: 10_000, spent: 7_900 },
      ],
      milestones: [
        { number: 1, title: "Design", status: "on-track", start: "2026-02-01", end: "2026-04-01" },
        { number: 2, title: "Integration", status: "at-risk", start: "2026-04-01", end: "2026-07-08" },
      ],
    },
    {
      name: "Reusable Propulsion Rig",
      client: "Spacetech",
      budgetUsedPct: 38,
      state: "at-risk",
      nextDeadline: "31 Jul 2026",
      flags: ["Underspend risk before acquittal"],
      projectStartDate: "2026-02-01",
      projectEndDate: "2026-07-31",
      maximumFunds: 45_000,
      totalProjectCost: 90_000,
      budgetCategories: [
        { name: "Test Facility", allocated: 70_000, spent: 24_000 },
        { name: "Materials", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { number: 1, title: "Build", status: "on-track", start: "2026-02-15", end: "2026-05-01" },
        { number: 2, title: "Test firing", status: "at-risk", start: "2026-05-01", end: "2026-07-31" },
      ],
    },
    {
      name: "Autonomous Drone Platform",
      client: "Aquila",
      budgetUsedPct: 72,
      state: "on-track",
      nextDeadline: "12 Jul 2026",
      flags: ["Milestone 2 on track"],
      projectStartDate: "2025-12-15",
      projectEndDate: "2026-07-12",
      maximumFunds: 95_000,
      totalProjectCost: 190_000,
      budgetCategories: [
        { name: "Software", allocated: 120_000, spent: 84_000 },
        { name: "Hardware", allocated: 30_000, spent: 22_000 },
        { name: "Field Trials", allocated: 25_000, spent: 19_000 },
        { name: "Operations", allocated: 15_000, spent: 11_500 },
      ],
      milestones: [
        { number: 1, title: "Prototype", status: "on-track", start: "2026-01-10", end: "2026-03-15" },
        { number: 2, title: "Field trial", status: "on-track", start: "2026-03-15", end: "2026-05-30" },
        { number: 3, title: "Certification", status: "on-track", start: "2026-05-30", end: "2026-07-12" },
      ],
    },
    {
      name: "Recycled Pigment Process",
      client: "Deluxe Paints",
      budgetUsedPct: 55,
      state: "on-track",
      nextDeadline: "28 Aug 2026",
      flags: ["All required invoices uploaded"],
      projectStartDate: "2026-02-15",
      projectEndDate: "2026-08-28",
      maximumFunds: 30_000,
      totalProjectCost: 60_000,
      budgetCategories: [
        { name: "R&D Labour", allocated: 40_000, spent: 24_000 },
        { name: "Materials", allocated: 20_000, spent: 9_000 },
      ],
      milestones: [
        { number: 1, title: "Lab validation", status: "on-track", start: "2026-03-01", end: "2026-06-01" },
        { number: 2, title: "Scale-up", status: "on-track", start: "2026-06-01", end: "2026-08-28" },
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

