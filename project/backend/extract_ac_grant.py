"""
Structured-data extractor for Accelerating Commercialisation (AC) grant
agreements.

All AC grant agreements follow the same standard Commonwealth template. The
template uses fixed *item numbers* inside Schedule 1 ("Agreement Details") and
Schedule 2 ("Project Details"). We use those item numbers (combined with their
well-known descriptive labels) as anchors: we find "Item 9" then read until
"Item 10", find "Item 10" then read until "Item 11", and so on. This is far more
robust than fixed coordinates because milestone / budget / report lists vary in
length from agreement to agreement.

Public entry point:

    extract_ac_grant(pdf_path: str) -> dict

The PDFs carry a real text layer, so we use pdfplumber's text extraction (no OCR
required).
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

import pdfplumber


# ---------------------------------------------------------------------------
# Low-level text helpers
# ---------------------------------------------------------------------------

# Repeated page footer that appears on every page of the template.
_FOOTER_RE = re.compile(
    r"Accelerating Commercialisation Funding Agreement\s*\|\s*Version.*?page\s*\d+",
    re.IGNORECASE,
)

# Repeated milestone table headers (the milestone list spans several pages and
# the column header is reprinted at the top of each page).
_MILESTONE_HEADER_RE = re.compile(
    r"^\s*Milestone\s+Milestone\s+Planned\s+Milestone\s*$"
    r"|^\s*number\s+Achievement\s+Date\s*$",
    re.IGNORECASE | re.MULTILINE,
)

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}


def _clean(text: Optional[str]) -> str:
    """Collapse runs of whitespace into single spaces and strip."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _is_na(text: Optional[str]) -> bool:
    """True when a field is explicitly marked not applicable."""
    if text is None:
        return True
    t = _clean(text).lower().rstrip(".")
    return t in {"", "n/a", "na", "not applicable", "nil", "none"}


def parse_money(text: Optional[str]) -> Optional[float]:
    """
    Parse a dollar amount into a number.

    "$320,731.00" -> 320731.0 ; "$0" -> 0.0 ; "N/A" -> None
    Returns an int when the value is whole, otherwise a float.
    """
    if _is_na(text):
        return None
    # Prefer a $-prefixed amount so a leading clause reference (e.g. "1.1" in
    # "1.1 $320,731.00") is never mistaken for the value.
    m = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", text)
    if not m:
        m = re.search(r"-?([\d,]+(?:\.\d+)?)", text)
    if not m:
        return None
    value = float(m.group(1).replace(",", ""))
    return int(value) if value.is_integer() else value


def parse_percentage(text: Optional[str]) -> Optional[float]:
    """'50%' -> 50 ; 'N/A' -> None."""
    if _is_na(text):
        return None
    m = re.search(r"([\d.]+)\s*%", text)
    if not m:
        return None
    value = float(m.group(1))
    return int(value) if value.is_integer() else value


def parse_date(text: Optional[str]) -> Optional[str]:
    """
    Parse a date into ISO format (YYYY-MM-DD), or return None.

    Handles the formats seen across AC agreements:
      "01 August 2020", "01August 2020" (missing space), "31/01/2021",
      "30 October 2020".
    """
    if _is_na(text):
        return None
    t = _clean(text)

    # Numeric DD/MM/YYYY (Australian ordering).
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", t)
    if m:
        day, month, year = (int(g) for g in m.groups())
        try:
            return datetime(year, month, day).date().isoformat()
        except ValueError:
            return None

    # "<day> <Month> <year>" — allow a missing space between day and month.
    m = re.search(r"\b(\d{1,2})\s*([A-Za-z]+)\s+(\d{4})\b", t)
    if m:
        day = int(m.group(1))
        month = _MONTHS.get(m.group(2).lower())
        year = int(m.group(3))
        if month:
            try:
                return datetime(year, month, day).date().isoformat()
            except ValueError:
                return None
    return None


def parse_date_or_text(text: Optional[str]) -> Optional[str]:
    """
    Return an ISO date when one can be parsed, otherwise the cleaned source
    text. Several Schedule 1 fields are descriptive ("The fifth anniversary of
    the Project End Date.") rather than literal dates, and we preserve those.
    """
    if _is_na(text):
        return None
    iso = parse_date(text)
    if iso:
        return iso
    return _clean(text) or None


# ---------------------------------------------------------------------------
# Anchoring
# ---------------------------------------------------------------------------

def _strip_footers(text: str) -> str:
    return _FOOTER_RE.sub("", text)


def _slice_between(
    text: str, start_pat: str, end_pats: List[str], last: bool = False
) -> Optional[str]:
    """
    Return the text between a match of ``start_pat`` and the earliest following
    match of any pattern in ``end_pats``. Returns None when the start anchor is
    not found.

    When ``last`` is True the final match of ``start_pat`` is used. Schedule
    headers appear once in the table of contents and once as the real section;
    the real section is always the last occurrence.
    """
    matches = list(re.finditer(start_pat, text))
    if not matches:
        return None
    start = matches[-1] if last else matches[0]
    begin = start.end()
    end = len(text)
    for pat in end_pats:
        m = re.search(pat, text[begin:])
        if m:
            end = min(end, begin + m.start())
    return text[begin:end]


# Ordered Schedule 2 item anchors. Each is "<number>." followed by the item's
# well-known label, so a stray "10." elsewhere will not match.
_S2_ANCHORS = [
    ("item1", r"(?m)^\s*1\.\s+Project reference number"),
    ("item2", r"(?m)^\s*2\.\s+Project title"),
    ("item3", r"(?m)^\s*3\.\s+Project Start Date"),
    ("item4", r"(?m)^\s*4\.\s+Project End Date"),
    ("item5", r"(?m)^\s*5\.\s+Maximum Funds"),
    ("item6", r"(?m)^\s*6\.\s+Grant percentage"),
    ("item7", r"(?m)^\s*7\.\s+Specified Personnel"),
    ("item8", r"(?m)^\s*8\.\s+Outcomes"),
    ("item9", r"(?m)^\s*9\.\s+Milestones"),
    ("item10", r"(?m)^\s*10\.\s+Budget"),
    ("item11", r"(?m)^\s*11\.\s+Annual Capped"),
    ("item12", r"(?m)^\s*12\.\s+Initial Progress Payment"),
    ("item13", r"(?m)^\s*13\.\s+Retention Amount"),
    ("item14", r"(?m)^\s*14\.\s+Reports"),
]


def _item_blocks(region: str, anchors) -> dict:
    """
    Given a schedule region and an ordered list of (key, anchor_pattern),
    return {key: text_of_that_item} by slicing from each anchor to the next
    anchor that is actually present.
    """
    # Record the start position of every anchor that is found.
    found = []
    for key, pat in anchors:
        m = re.search(pat, region)
        if m:
            found.append((m.start(), m.end(), key))
    found.sort()

    blocks = {}
    for i, (_start, end, key) in enumerate(found):
        stop = found[i + 1][0] if i + 1 < len(found) else len(region)
        blocks[key] = region[end:stop].strip()
    return blocks


# ---------------------------------------------------------------------------
# Schedule 1
# ---------------------------------------------------------------------------

def _extract_schedule1(full_text: str) -> dict:
    region = _slice_between(
        full_text,
        r"Schedule\s+1\s*[–-]\s*Agreement Details",
        [r"Schedule\s+2\s*[–-]\s*Project Details"],
        last=True,
    )
    region = region or ""

    out = {
        "recipient": {"name": None, "abn": None},
        "agreement_commencement_date": None,
        "agreement_end_date": None,
    }

    # Item 2 — Recipient name + ABN. The label may wrap, the value follows the
    # clause reference (e.g. "1.1"), and the ABN is on the next line.
    m = re.search(
        r"(?m)^\s*2\.\s+Recipient Name\s+[\d.]+\s+(?P<name>.+?)\s*\n"
        r"\s*ABN\s+(?P<abn>[\d ]+)",
        region,
    )
    if m:
        out["recipient"]["name"] = _clean(m.group("name"))
        out["recipient"]["abn"] = _clean(m.group("abn"))

    # Item 4 — Agreement Commencement Date (often descriptive text).
    block4 = _slice_between(
        region,
        r"(?m)^\s*4\.\s+Agreement",
        [r"(?m)^\s*5\.\s+Agreement End Date"],
    )
    if block4:
        # The label "Agreement Commencement Date" wraps across two lines, so the
        # words "Commencement Date" land in the middle of the detail text. Drop
        # the clause reference and the stray label words.
        detail = re.sub(r"^\s*[\d.]+(?:\s+and\s+\d+)?\s*", " ", block4, count=1)
        detail = detail.replace("Commencement Date", " ")
        out["agreement_commencement_date"] = parse_date_or_text(detail)

    # Item 5 — Agreement End Date (often descriptive text).
    block5 = _slice_between(
        region,
        r"(?m)^\s*5\.\s+Agreement End Date",
        [r"(?m)^\s*6\.\s+Insurance", r"(?m)^\s*6\.\s"],
    )
    if block5:
        detail = re.sub(r"^\s*[\d.\sand]+", " ", block5, count=1)
        out["agreement_end_date"] = parse_date_or_text(detail)

    return out


# ---------------------------------------------------------------------------
# Schedule 2 — simple items
# ---------------------------------------------------------------------------

def _value_after_clause(block: str) -> str:
    """
    Items 1-6 follow the pattern "<clause ref e.g. 1.1> <value>". Strip the
    leading clause reference and return the value.
    """
    return _clean(re.sub(r"^\s*[\d.]+\s+", "", block, count=1))


# ---------------------------------------------------------------------------
# Schedule 2 — Item 9 milestones
# ---------------------------------------------------------------------------

# A milestone starts with its number, a title, and the achievement date at the
# end of the same line, e.g. "1 Upgrade paneer machinery ... 31/01/2021".
_MILESTONE_START_RE = re.compile(
    r"(?m)^(?P<num>\d+)\s+(?P<title>.+?)\s+(?P<date>\d{1,2}/\d{1,2}/\d{4})\s*$"
)


def _split_bullets(text: str) -> List[str]:
    """
    Split a block of bulleted text into a list. Bullets are introduced by '-'
    or '•' (sometimes with no following space); continuation lines are joined
    onto the current bullet.
    """
    items: List[str] = []
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^[-•]\s*(.*)$", line)
        if m:
            if current is not None:
                items.append(_clean(current))
            current = m.group(1)
        else:
            if current is None:
                current = line
            else:
                current += " " + line
    if current is not None:
        items.append(_clean(current))
    return [i for i in items if i]


def _parse_milestones(block: str) -> List[dict]:
    if not block:
        return []

    # Remove the reprinted column headers that appear on each page.
    block = _MILESTONE_HEADER_RE.sub("", block)

    starts = list(_MILESTONE_START_RE.finditer(block))
    milestones: List[dict] = []
    for i, m in enumerate(starts):
        seg_start = m.end()
        seg_end = starts[i + 1].start() if i + 1 < len(starts) else len(block)
        body = block[seg_start:seg_end]

        # Title may continue on the lines before "Activities:".
        title = m.group("title").strip()
        before_activities = re.split(r"(?i)Activities\s*:", body, maxsplit=1)
        title_tail = before_activities[0]
        if title_tail.strip():
            title = _clean(title + " " + title_tail)
        else:
            title = _clean(title)

        activities: List[str] = []
        measurable: List[str] = []
        if len(before_activities) > 1:
            rest = before_activities[1]
            parts = re.split(
                r"(?i)Expected measurable outcome\(s\)\s*:", rest, maxsplit=1
            )
            activities = _split_bullets(parts[0])
            if len(parts) > 1:
                measurable = _split_bullets(parts[1])

        milestones.append({
            "number": int(m.group("num")),
            "title": title,
            "activities": activities,
            "measurable_outcomes": measurable,
            "planned_achievement_date": parse_date(m.group("date")),
        })
    return milestones


# ---------------------------------------------------------------------------
# Schedule 2 — Item 10 budget
# ---------------------------------------------------------------------------

_BUDGET_ROW_RE = re.compile(
    r"(?m)^(?P<cat>[A-Za-z][A-Za-z /.]+?)\s+"
    r"(?P<vals>(?:\$?\s*[\d,]+(?:\.\d+)?\s*){1,3})$"
)
_MONEY_TOKEN_RE = re.compile(r"\$?\s*([\d,]+(?:\.\d+)?)")


def _parse_budget(block: str) -> List[dict]:
    if not block:
        return []
    rows: List[dict] = []
    for m in _BUDGET_ROW_RE.finditer(block):
        category = _clean(m.group("cat"))
        # Skip header-ish lines that slipped through.
        if category.lower().startswith(("financial year", "estimated", "total eligible")):
            continue
        nums = [float(t.replace(",", "")) for t in _MONEY_TOKEN_RE.findall(m.group("vals"))]
        nums = [int(n) if n.is_integer() else n for n in nums]
        # Map positionally onto (year1, year2, total).
        year1 = nums[0] if len(nums) >= 1 else None
        year2 = nums[1] if len(nums) >= 2 else None
        total = nums[2] if len(nums) >= 3 else None
        rows.append({
            "category": category,
            "year1": year1,
            "year2": year2,
            "total": total,
            "is_total": category.lower().startswith("total"),
        })
    return rows


# ---------------------------------------------------------------------------
# Schedule 2 — Item 11 annual capped amounts
# ---------------------------------------------------------------------------

_CAPPED_ROW_RE = re.compile(
    r"(?m)^(?P<fy>\d{4}/\d{2,4}|Total)\s*\$?\s*(?P<amt>[\d,]+(?:\.\d+)?)\s*$"
)


def _parse_capped(block: str) -> List[dict]:
    if not block:
        return []
    rows: List[dict] = []
    for m in _CAPPED_ROW_RE.finditer(block):
        rows.append({
            "financial_year": m.group("fy"),
            "capped_amount": parse_money(m.group("amt")),
        })
    return rows


# ---------------------------------------------------------------------------
# Schedule 2 — Item 14 reports
# ---------------------------------------------------------------------------

_REPORT_ROW_RE = re.compile(
    r"(?m)^(?P<type>.+?Report[s]?)\s+"
    r"(?P<due>\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+"
    r"(?P<pstart>\d{1,2}\s*[A-Za-z]+\s+\d{4})\s*-\s*"
    r"(?P<pend>\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*$"
)

# Descriptive rows: "<type> 30 days after request for ... To be advised".
_REPORT_DESC_RE = re.compile(
    r"(?m)^(?P<type>.+?Report[s]?)\s+30 days after request for.*$"
)


def _parse_reports(block: str) -> List[dict]:
    if not block:
        return []
    reports: List[dict] = []

    for m in _REPORT_ROW_RE.finditer(block):
        reports.append({
            "report_type": _clean(m.group("type")),
            "due_date": parse_date(m.group("due")),
            "period_start_date": parse_date(m.group("pstart")),
            "period_end_date": parse_date(m.group("pend")),
        })

    for m in _REPORT_DESC_RE.finditer(block):
        reports.append({
            "report_type": _clean(m.group("type")),
            "due_date": "30 days after request for completion",
            "period_start_date": None,
            "period_end_date": None,
        })

    return reports


# ---------------------------------------------------------------------------
# Schedule 2 — orchestration
# ---------------------------------------------------------------------------

def _extract_schedule2(full_text: str) -> dict:
    region = _slice_between(
        full_text,
        r"Schedule\s+2\s*[–-]\s*Project Details",
        [r"Schedule\s+3\s*[–-]", r"Schedule\s+3\b"],
        last=True,
    )
    region = region or ""
    blocks = _item_blocks(region, _S2_ANCHORS)

    project_title = None
    if "item2" in blocks:
        project_title = _value_after_clause(blocks["item2"]) or None

    # Item 8 — the full outcomes/description narrative.
    project_outcomes = None
    if "item8" in blocks:
        text = re.sub(r"^\s*and description\s*\(clause[^)]*\)", "", blocks["item8"], count=1)
        project_outcomes = _clean(text) or None

    return {
        "project_reference_number": (_value_after_clause(blocks["item1"]) or None)
            if "item1" in blocks else None,
        "project_title": project_title,
        "project_start_date": parse_date(blocks.get("item3", "")),
        "project_end_date": parse_date(blocks.get("item4", "")),
        "maximum_funds": parse_money(blocks.get("item5", "")),
        "grant_percentage": parse_percentage(blocks.get("item6", "")),
        "project_outcomes": project_outcomes,
        "milestones": _parse_milestones(blocks.get("item9", "")),
        "budget": _parse_budget(blocks.get("item10", "")),
        "annual_capped_amounts": _parse_capped(blocks.get("item11", "")),
        "initial_progress_payment": parse_money(blocks.get("item12", "")),
        "retention_amount": parse_money(blocks.get("item13", "")),
        "reports": _parse_reports(blocks.get("item14", "")),
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def extract_ac_grant(pdf_path: str) -> dict:
    """
    Extract structured data from an Accelerating Commercialisation grant
    agreement PDF and return it as a dictionary.

    Raises ValueError if the document does not look like an AC agreement.
    """
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    full_text = _strip_footers("\n".join(pages))

    if "Schedule 1" not in full_text or "Schedule 2" not in full_text:
        raise ValueError(
            "This file does not appear to be an Accelerating Commercialisation "
            "grant agreement (Schedule 1 / Schedule 2 not found)."
        )

    data = {}
    data.update(_extract_schedule1(full_text))
    data.update(_extract_schedule2(full_text))
    return data


if __name__ == "__main__":
    import json
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "../../Agreement Organic Holdings AC82558.pdf"
    print(json.dumps(extract_ac_grant(path), indent=2, ensure_ascii=False))
