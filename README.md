# Gale

A pilot desk for the team that buys a GB supplier’s power in the day-ahead auctions. For January 2026 it shows the national wind forecast that had already been published when each order book closed, and it scores that forecast against the wind that was generated.

The forecast runs about 1.8 GW high for the month, at every gate. It still removes 46% of the absolute error of a desk that simply repeated yesterday’s wind. Waiting from the 09:20 auction to the 09:50 auction changed the day’s wind by 135 MW on average. The error that matters is the level of the forecast, not which morning book it sat in.

## Live app

<https://q8n4kw.vercel.app>

It opens on 15 January in the N2EX book. `?gate=epex` and `?gate=hh` switch the auction. The left and right arrow keys move the delivery day.

## Run it

Docker, from this directory:

```bash
docker compose up --build
```

Then open <http://localhost:8000>.

Without Docker, two processes:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn gale.main:app --app-dir backend --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to port 8000.

Tests:

```bash
pytest
```

## What a buyer is looking at

Three order books, all on the day before delivery, times as published by the exchanges in GMT. January 2026 is inside GMT, so these are also London times.

| Book | Close | Forecast in the book |
| --- | --- | --- |
| EPEX day-ahead | 09:20 | the 07:30 run, every hour |
| N2EX day-ahead | 09:50 | the 09:30 run, every hour |
| EPEX half-hour | 15:30 | the 11:30 run, except 16 January |

A forecast is in the book only when `publishTime` is strictly earlier than the close. The half-hour auction and a wind run are both stamped 15:30, so that run is not treated as available. On 15 January a run was published at 12:25 instead of on the usual clock. It was too late for both morning auctions and in time for the half-hour auction into the 16th. The desk says so.

WINDFOR is hourly. FUELHH wind is half-hourly. The scored outturn is the mean of the two half-hours. Both half-hours are drawn, because the forecast has no shape inside the hour. They differed by 217 MW on average.

Error is forecast minus outturn. Positive means the book counted wind that did not arrive.

Yesterday’s outturn, same hour, is the naive comparison. Skill is the share of that absolute error the national forecast removes.

The haircut on an hour is the 90th percentile of that error over earlier deliveries of the same hour, once seven exist, and it is never negative. It is not fitted on the hour it is applied to. Counted wind is the forecast minus the haircut.

Curtailment is not in either series. A high forecast and wind the system turned down cannot be separated here. There is no demand and no price in this pilot, so the desk does not say how many megawatts to buy.

## Files and directories

```
api/index.py                 Vercel entry, re-exports the FastAPI app
backend/gale/gates.py        Auction closes and the strict publish rule
backend/gale/series.py       Hourly join of FUELHH and WINDFOR
backend/gale/metrics.py      MAE, RMSE, bias, quantiles, skill
backend/gale/desk.py         Month payload, haircut, revision between gates
backend/gale/main.py         HTTP API
backend/tests/               Gate rule, metrics, and the January extract
backend/data/fuelhh.json     FUELHH wind, 31 Dec 2025–31 Jan 2026
backend/data/windfor.json    WINDFOR publishes covering those decisions
frontend/                    React desk
scripts/fetch_elexon.py      Rebuild the extract from BMRS
Dockerfile                   API and the built desk, one image
docker-compose.yml
vercel.json                  Build and the Vercel function entry
docs/video-script.md         Shot list for the ten-minute review
```

`GET /api/health` reports the month and the publish clocks. `GET /api/bundle` returns all three books. `GET /api/desk?gate=n2ex` returns one.

## Refreshing the extract

```bash
python3 scripts/fetch_elexon.py
```

That rewrites `backend/data`. The API builds the month from those files at startup.

## AI tools

This application was built with assistance from Cursor’s coding agent (Grok 4.7). The auction times were checked against the schedules published by EPEX SPOT and Nord Pool. The figures were computed from the Elexon BMRS responses stored in `backend/data`, and the gate rule is locked by the tests in `backend/tests`.
