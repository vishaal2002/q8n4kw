import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { loadBundle } from "./api";
import { Chart } from "./components/Chart";
import { DayStrip } from "./components/DayStrip";
import { Lower } from "./components/Lower";
import { biasWord, coverSentence, decisionSentence, exceptionLine, resultSentence, revisionSentence, runLine } from "./copy";
import { clock, hourLabel, mw, percent, signedGwh, signedMw } from "./format";
import type { Bundle, Desk, GateId } from "./types";

const GATES: GateId[] = ["epex", "n2ex", "hh"];

export function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateId>(() => readGate());
  const [day, setDay] = useState(() => readDay());
  const reduced = useReducedMotion();

  useEffect(() => {
    loadBundle().then(setBundle).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "The desk could not be read.");
    });
  }, []);

  const desk = bundle?.gates[gate] ?? null;
  const selected = desk?.days.find((item) => item.date === day) ?? desk?.days[14] ?? null;

  useEffect(() => {
    if (!desk || !selected) return;
    const params = new URLSearchParams({ gate, day: selected.date });
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [desk, gate, selected]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!desk || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "SUMMARY")) return;
      const index = desk.days.findIndex((item) => item.date === selected?.date);
      const next = index + (event.key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= desk.days.length) return;
      event.preventDefault();
      setDay(desk.days[next].date);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desk, selected]);

  return (
    <div className="sheet">
      <aside className="rail">
        <header className="brand">
          <p className="kicker">Pilot · January 2026</p>
          <h1>Gale</h1>
          <p className="purpose">The national wind forecast a GB supply desk could actually use, and how far it was from the wind that arrived.</p>
        </header>

        <fieldset>
          <legend>Order book</legend>
          {GATES.map((id) => {
            const item = bundle?.gates[id];
            return (
              <label key={id} className={id === gate ? "on" : ""}>
                <input
                  type="radio"
                  name="gate"
                  value={id}
                  checked={id === gate}
                  onChange={() => setGate(id)}
                />
                <span>{item?.gate.name ?? id}</span>
                <b>{item?.gate.closeGmt ?? ""}</b>
              </label>
            );
          })}
        </fieldset>
        {desk ? (
          <p className="note">
            {desk.gate.note} {runLine(desk)} {exceptionLine(desk)}
          </p>
        ) : null}

        {desk ? <Score desk={desk} /> : null}
        {desk ? <p className="cover">{coverSentence(desk)}</p> : null}
        {desk && revisionSentence(desk) ? <p className="cover">{revisionSentence(desk)}</p> : null}

        <p className="source">Elexon FUELHH wind and WINDFOR. Nothing else is in this pilot.</p>
      </aside>

      <main>
        {error ? <p className="lead">{error}</p> : null}
        {!desk || !selected ? (
          error ? null : <p className="lead">Reading the January extract.</p>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${gate}-${selected.date}`}
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reduced ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
              >
                <p className="lead">{decisionSentence(selected, desk)}</p>
                <p className="result">{resultSentence(selected)}</p>
              </motion.div>
            </AnimatePresence>
            <Chart day={selected} />
            <DayStrip days={desk.days} selected={selected.date} onSelect={setDay} />
            <Lower desk={desk} />
            <Audit desk={desk} day={selected} />
          </>
        )}
      </main>
    </div>
  );
}

function Score({ desk }: { desk: Desk }) {
  const { score } = desk;
  const skill = score.skill;
  return (
    <dl className="score">
      <div>
        <dt>Absolute error</dt>
        <dd>{mw(score.maeMw)}</dd>
        <dd className="hint">Mean, over {score.hours.toLocaleString("en-GB")} paired hours</dd>
      </div>
      <div>
        <dt>Bias</dt>
        <dd className={tone(score.biasMw)}>{signedMw(score.biasMw)}</dd>
        <dd className="hint">
          {biasWord(score.biasMw)}. Net {signedGwh(score.energyErrorGwh)}
        </dd>
      </div>
      <div>
        <dt>Against yesterday</dt>
        <dd>{skill == null ? "—" : `${Math.round(skill * 100)}%`}</dd>
        <dd className="hint">
          {skill != null && skill < 0 ? "More error than yesterday's wind" : "Of yesterday's absolute error, removed"}
        </dd>
      </div>
      <div>
        <dt>Haircut held</dt>
        <dd>{percent(desk.cover.coverage)}</dd>
        <dd className="hint">Of later hours, after {desk.cover.minHistory} precedents</dd>
      </div>
    </dl>
  );
}

function Audit({ desk, day }: { desk: Desk; day: Desk["days"][number] }) {
  const { score } = desk;
  return (
    <div className="audit">
      <details>
        <summary>Half-hours for {day.date}</summary>
        <table>
          <thead>
            <tr>
              <th>Hour</th>
              <th>SP</th>
              <th>Forecast</th>
              <th>Half-hours</th>
              <th>Outturn</th>
              <th>Error</th>
              <th>Counted</th>
              <th>Run</th>
            </tr>
          </thead>
          <tbody>
            {day.hours.map((hour) => (
              <tr key={hour.start}>
                <td>{hourLabel(hour.hour)}</td>
                <td>{hour.halves.map((half) => half.settlementPeriod).join("–") || "—"}</td>
                <td>{mw(hour.forecastMw)}</td>
                <td>{hour.halves.map((half) => Math.round(half.generationMw).toLocaleString("en-GB")).join(" / ") || "—"}</td>
                <td>{mw(hour.actualMw)}</td>
                <td className={tone(hour.errorMw)}>{signedMw(hour.errorMw)}</td>
                <td>{hour.countedMw == null ? "—" : mw(hour.countedMw)}</td>
                <td>{clock(hour.publishTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <details>
        <summary>How these numbers are made</summary>
        <div className="method">
          <p>
            Gale scores the forecast a buyer could have held, not a run published later the same morning. The close is the GMT time stated by the exchange. A WINDFOR value is in the book only when its publish time is strictly earlier. For each delivery hour the book keeps the latest of those.
          </p>
          <p>
            WINDFOR is an hourly megawatt forecast. FUELHH wind is the half-hourly outturn. The scored outturn is the mean of the two half-hours in that hour, and both are drawn so the shape inside the hour stays visible. Those two half-hours differed by {mw(score.withinHourSpreadMw)} on average. An hourly forecast cannot follow that.
          </p>
          <p>
            Error is forecast minus outturn. Positive means the book counted wind that did not arrive, and a residual bought to match the forecast would have been short. The outturn is generation after the system has acted. Curtailment is not in these two series, so a high forecast and wind that was turned down cannot be separated here. Yesterday's outturn for the same hour is the naive book. The national forecast removed {score.skill == null ? "—" : `${Math.round(score.skill * 100)}%`} of that absolute error. Root-mean-square error was {mw(score.rmseMw)}. Error weighted by outturn was {percent(score.wape, 1)}. The forecast and the outturn moved together with correlation {score.correlation ?? "—"}.
          </p>
          <p>
            The haircut on an hour is the 90th percentile of that error over earlier deliveries of the same hour, once {desk.cover.minHistory} exist, and it is never negative. It is not fitted on the hour it is applied to. Counted wind is the forecast minus the haircut. The haircut held when outturn was at least that counted wind. Runs were published at {desk.source.publishClocksGmt.join(", ")} GMT. {score.hours} of {score.expectedHours} hours in the month could be paired.
          </p>
          <button
            type="button"
            onClick={() => download(`gale-${desk.gate.id}-2026-01.csv`, monthCsv(desk))}
          >
            Download the paired hours
          </button>
        </div>
      </details>
    </div>
  );
}

function tone(value: number | null): string {
  if (value == null || Math.abs(value) < 50) return "";
  return value > 0 ? "high" : "low";
}

function monthCsv(desk: Desk): string {
  const lines = ["delivery_date,start,forecast_mw,actual_mw,error_mw,haircut_mw,counted_mw,publish_time"];
  for (const day of desk.days) {
    for (const hour of day.hours) {
      lines.push(
        [
          day.date,
          hour.start,
          hour.forecastMw ?? "",
          hour.actualMw ?? "",
          hour.errorMw ?? "",
          hour.haircutMw ?? "",
          hour.countedMw ?? "",
          hour.publishTime ?? "",
        ].join(","),
      );
    }
  }
  return lines.join("\n");
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readGate(): GateId {
  const value = new URLSearchParams(window.location.search).get("gate");
  return value === "epex" || value === "hh" || value === "n2ex" ? value : "n2ex";
}

function readDay(): string {
  const value = new URLSearchParams(window.location.search).get("day");
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "2026-01-15";
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}
