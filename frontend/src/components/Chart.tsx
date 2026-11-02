import { useState } from "react";
import type { Day } from "../types";
import { gw, hourLabel, mw, signedMw } from "../format";

interface Props {
  day: Day;
}

export function Chart({ day }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 840;
  const height = 332;
  const pad = { l: 52, r: 16, t: 18, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const slot = innerW / 24;
  const values = day.hours.flatMap((hour) =>
    [hour.forecastMw, hour.actualMw, hour.countedMw, ...hour.halves.map((half) => half.generationMw)].filter(
      (value): value is number => value != null,
    ),
  );
  const max = niceMax(Math.max(0, ...values));
  const y = (value: number) => pad.t + (1 - value / max) * innerH;
  const hasCount = day.hours.some((hour) => hour.countedMw != null);
  const ticks = axisTicks(max);
  const active = hover == null ? null : day.hours[hover];

  return (
    <figure className="chart">
      <div className="plot">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Forecast held at the gate and outturn for ${day.date}`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="grid" x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} />
              <text className="tick" x={pad.l - 8} y={y(tick) + 4} textAnchor="end">
                {tick === 0 ? "0" : tick / 1000}
              </text>
            </g>
          ))}
          <text className="unit" x={pad.l} y={12}>
            GW
          </text>
          {day.hours.map((hour, index) => (
            <rect
              key={hour.start}
              className="hit"
              x={pad.l + index * slot}
              y={pad.t}
              width={slot}
              height={innerH}
              fill={hover === index ? "rgba(26, 31, 28, 0.045)" : "transparent"}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          <path className="forecast" d={stepPath(day, "forecastMw", pad.l, slot, y)} />
          {hasCount ? <path className="counted" d={stepPath(day, "countedMw", pad.l, slot, y)} /> : null}
          <path className="outturn" d={outturnPath(day, pad.l, slot, y)} />
          {[0, 6, 12, 18].map((hour) => (
            <text key={hour} className="tick hour" x={pad.l + hour * slot} y={height - 8}>
              {String(hour).padStart(2, "0")}
            </text>
          ))}
        </svg>
        {active ? (
          <div
            className="tip"
            style={{
              left: `${((pad.l + (hover ?? 0) * slot + slot / 2) / width) * 100}%`,
              transform: (hover ?? 0) > 16 ? "translateX(-105%)" : "translateX(8px)",
            }}
          >
            <strong>
              {hourLabel(active.hour)}–{hourLabel((active.hour + 1) % 24)}
              {active.halves.length
                ? ` · SP${active.halves.map((half) => half.settlementPeriod).join("–SP")}`
                : ""}
            </strong>
            <span>Forecast {mw(active.forecastMw)}</span>
            <span>
              Outturn{" "}
              {active.halves.length
                ? active.halves.map((half) => Math.round(half.generationMw).toLocaleString("en-GB")).join(" / ")
                : "—"}{" "}
              MW
            </span>
            <span>Error {signedMw(active.errorMw)}</span>
            {active.haircutMw != null ? (
              <span>
                Counted {mw(active.countedMw)} after a {mw(active.haircutMw)} haircut
              </span>
            ) : (
              <span>No haircut yet. This hour is still inside the first week.</span>
            )}
          </div>
        ) : null}
      </div>
      <figcaption>
        <span>
          <i className="swatch forecast" /> Forecast held at the gate
        </span>
        <span>
          <i className="swatch outturn" /> Outturn, half-hour
        </span>
        {hasCount ? (
          <span>
            <i className="swatch counted" /> Wind counted, after the haircut
          </span>
        ) : (
          <span>No haircut on this day. The first week is the history, not the test.</span>
        )}
        <span className="level">Day average {gw(day.meanForecastMw)} forecast, {gw(day.meanActualMw)} outturn</span>
      </figcaption>
    </figure>
  );
}

function niceMax(mwValue: number): number {
  const step = mwValue > 20000 ? 5000 : 2500;
  return Math.max(step, Math.ceil((mwValue * 1.06) / step) * step);
}

function axisTicks(max: number): number[] {
  const step = 5000;
  const ticks = [];
  for (let value = 0; value <= max + 1; value += step) ticks.push(value);
  if (ticks.length < 3) return [0, max / 2, max];
  return ticks;
}

function stepPath(
  day: Day,
  key: "forecastMw" | "countedMw",
  origin: number,
  slot: number,
  y: (value: number) => number,
): string {
  let path = "";
  let drawing = false;
  day.hours.forEach((hour, index) => {
    const value = hour[key];
    if (value == null) {
      drawing = false;
      return;
    }
    const x0 = origin + index * slot;
    const y0 = y(value);
    path += `${drawing ? "L" : "M"}${x0.toFixed(1)},${y0.toFixed(1)} L${(x0 + slot).toFixed(1)},${y0.toFixed(1)} `;
    drawing = true;
  });
  return path;
}

function outturnPath(day: Day, origin: number, slot: number, y: (value: number) => number): string {
  const points: string[] = [];
  day.hours.forEach((hour, index) => {
    hour.halves.forEach((half, halfIndex) => {
      const x = origin + index * slot + ((halfIndex + 0.5) * slot) / Math.max(hour.halves.length, 1);
      points.push(`${x.toFixed(1)},${y(half.generationMw).toFixed(1)}`);
    });
  });
  return points.length ? `M${points.join(" L")}` : "";
}
