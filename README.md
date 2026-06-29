# Noah_connect


# AC Grant Dashboard

Full-stack app that extracts structured data from any Accelerating
Commercialisation (AC) grant agreement PDF and shows it in a visual dashbo
ard.

- **Backend** â Python FastAPI service that accepts a PDF upload, runs a
  pdfplumber-based extractor that anchors on the fixed Schedule 1 / Schedu
le 2
  item numbers, and returns structured JSON.
- **Frontend** â React + Tailwind + Recharts dashboard: upload screen, gra
nt
  header, milestone tracker, budget table + bar chart, reporting calendar,
 and
  key financials.

## Project structure

```
project/
  backend/
    main.py               # FastAPI app, POST /extract
    extract_ac_grant.py   # PDF extraction logic
    requirements.txt
  frontend/
    src/App.jsx           # whole dashboard UI
    ...
```

## Run the backend

```bash
cd project/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py            # serves http://localhost:8000
```

`POST /extract` accepts a multipart `file` (PDF) and returns the extracted
 JSON.

## Run the frontend

```bash
cd project/frontend
npm install
npm run dev               # serves http://localhost:5173
```

Open http://localhost:5173, drop in an AC grant agreement PDF, and the
dashboard populates automatically. The backend must be running on port 800
0.

## Extracted fields

Schedule 1: recipient name + ABN, agreement commencement/end dates.
Schedule 2: project reference, title, start/end dates, maximum funds, gran
t
percentage, outcomes, milestones (activities + measurable outcomes + due d
ate),
budget by category, annual capped amounts, initial progress payment, reten
tion
amount, and the reports schedule. Dates are normalised to ISO `YYYY-MM-DD`
,
dollar amounts to numbers, and `N/A` fields to `null`.
```
