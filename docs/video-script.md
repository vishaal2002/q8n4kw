# Recording the ten minutes

Unlisted YouTube video, two parts, ten minutes in total. Record the desk at `/?gate=n2ex&day=2026-01-15`, full window, and read in your own voice. The clicks below are the whole demo. Left and right arrows move the delivery day.

Do not say the 09:30 run fixes the bias. It does not. Do not say the desk knows how much power to buy. It has no demand and no price. Do not explain the high bias as curtailment. The series cannot show that.

## Part 1 — the buyer, about five minutes

**0:00** Start on 15 January, N2EX selected. One sentence: this is the wind forecast that was already published when the day-ahead book closed, and how that forecast compared with the wind that arrived. January 2026, national wind, Elexon only.

**0:30** Read the headline. On Wednesday 14 January the N2EX book closed at 09:50. The newest run already in was 09:30, and it put Thursday at 11.7 GW. Outturn was 10.6 GW. The book was 1.1 GW short of wind.

**1:10** Point at the three lines. Black is the forecast held at the gate. Green is the half-hourly outturn. The dashed line is the wind you would count after a haircut learned from earlier days, not from this one.

**1:40** Point at the month strip. Almost every day sits above the line: the forecast was high. Click **28**. The 09:30 run said 11.1 GW. The day delivered 5.8 GW. That is the hour the book feels.

**2:20** Come back to the four figures, still on N2EX. Absolute error 2,123 MW. Bias +1,840 MW, and +1,369 GWh over the month: the forecasts contained that much more wind than was generated. Against yesterday, 46% of the absolute error is gone. Repeating yesterday’s wind was a 4.0 GW error. The national forecast is worth having, and it is not worth taking at face value.

**3:10** The haircut. Once an hour had seven earlier deliveries, counted wind is the forecast minus the 90th percentile of the error so far. That haircut averaged 4,164 MW and held on 86% of the later hours. It is wider than the 1.8 GW average miss, on purpose. It is a description of this month, not a bid for February.

**3:50** Click **EPEX day-ahead**. The book closes at 09:20, so it is still holding the 07:30 run. The headline moves from 11.7 GW to 11.6 GW. Read the line under the score: relative to EPEX, the 09:30 run moved a day by 135 MW on average. The largest move was 500 MW, on 31 January. The ten minutes between the two morning auctions was not where January’s error lived.

**4:25** Click **EPEX half-hour**, then day **16**. The usual run in this book is 11:30. On the 16th the book held a 12:25 run, published the afternoon before, off the normal clock. A run stamped 15:30, level with the bell, is not treated as being in the book.

**4:45** Close. The pilot says how much wind the desk could count, and how wrong that count was. It does not say what to buy. Demand, price, and curtailment are not in these two series.

## Part 2 — the technical review, about five minutes

**0:00** Same screen, then the repository. React desk, FastAPI, one Docker image. The month is built from a frozen Elexon extract so a review does not depend on BMRS being up. `scripts/fetch_elexon.py` rebuilds it.

**0:40** Open `backend/gale/gates.py`. The closes are the GMT times published by EPEX and Nord Pool: 09:20, 09:50, 15:30. A row counts only when `publishTime` is strictly before the close. That one comparison is why 09:30 is in N2EX and not in EPEX, and why the 15:30 wind run is out of the half-hour auction.

**1:20** Open `backend/tests/test_desk.py` and `backend/tests/test_api.py`. The first locks the rule on a fixture: 07:30, 09:30, and 11:30, and a publish at the bell is dropped. The API test locks the January extract: 744 paired hours, those three publish times, and the single off-clock day, 16 January at 12:25.

**2:05** Open `backend/gale/series.py` and `desk.py`. WINDFOR is joined on the hour. The outturn is the mean of the two FUELHH half-hours. Error is forecast minus outturn. The haircut for hour 14 on a day uses only earlier days’ hour 14. The tests check that the first seven days get no haircut, and that yesterday is the baseline for skill.

**3:00** Back on the desk, open **How these numbers are made**. MAE, RMSE, weighted absolute error, correlation, the within-hour spread of 217 MW, and the limit: outturn is generation after the system has acted. Open **Half-hours** on 15 January and show one row, forecast against the two settlement periods. Mention **Download the paired hours**.

**3:50** Point at the layout. `frontend/src` is the desk. `api/index.py` is the same FastAPI app for Vercel. `Dockerfile` builds the frontend and serves it from the API. `pytest` is the gate rule, the metrics, and a check that the January extract still has 744 paired hours and the 12:25 run on 16 January.

**4:30** How to run: `docker compose up --build`, or the API on port 8000 and `npm run dev` in `frontend`. The dev server proxies `/api`. Stop there.
