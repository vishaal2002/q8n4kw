"""HTTP surface. The month is built once from the frozen Elexon extract."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from gale.desk import build_bundle
from gale.gates import BY_ID

DATA = Path(__file__).resolve().parents[1] / "data"

app = FastAPI(title="Gale", version="1.0.0")
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def bundle() -> dict[str, dict]:
    actuals = json.loads((DATA / "fuelhh.json").read_text())
    forecasts = json.loads((DATA / "windfor.json").read_text())
    return build_bundle(actuals, forecasts)


@app.get("/api/health")
def health() -> dict:
    desks = bundle()
    sample = next(iter(desks.values()))
    return {
        "ok": True,
        "month": "2026-01",
        "gates": list(BY_ID),
        "hours": sample["score"]["hours"],
        "publishClocksGmt": sample["source"]["publishClocksGmt"],
    }


@app.get("/api/bundle")
def get_bundle() -> dict:
    return {"gates": bundle()}


@app.get("/api/desk")
def get_desk(gate: str = "n2ex") -> dict:
    desks = bundle()
    if gate not in desks:
        raise HTTPException(status_code=404, detail="Unknown gate")
    return desks[gate]


def mount_frontend(directory: str | None) -> None:
    if not directory:
        return
    path = Path(directory)
    if path.is_dir():
        # Registered after the API routes, so /api keeps priority.
        app.mount("/", StaticFiles(directory=path, html=True), name="frontend")


DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
mount_frontend(os.environ.get("GALE_STATIC") or (str(DIST) if DIST.is_dir() else None))
