"""
FastAPI backend for the AC grant dashboard.

Exposes a single endpoint, POST /extract, which accepts a PDF upload of an
Accelerating Commercialisation grant agreement, runs the extractor, and returns
the structured data as JSON.

Run with:
    uvicorn main:app --reload --port 8000
or simply:
    python main.py
"""

from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from extract_ac_grant import extract_ac_grant

app = FastAPI(title="AC Grant Extractor", version="1.0.0")

# Allow the React dev server (and any local origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "AC Grant Extractor"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    """Accept a PDF upload and return the extracted grant data as JSON."""
    filename = file.filename or "upload.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # extract_ac_grant works on a file path, so persist to a temp file.
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        data = extract_ac_grant(tmp_path)
        return JSONResponse(content=data)

    except ValueError as exc:
        # Document didn't look like an AC agreement.
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 - surface a clean message to the UI
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract grant data: {exc}",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
