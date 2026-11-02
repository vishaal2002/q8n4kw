import type { Desk } from "../types";
import { mw, signedMw } from "../format";

function HistogramScale({ bins }: { bins: Desk["histogram"] }) {
  const lo = bins[0]?.lo ?? 0;
  const hi = bins.at(-1)?.hi ?? 0;
  const span = hi - lo || 1;
  const zero = Math.min(100, Math.max(0, ((0 - lo) / span) * 100));
  return (
    <div className="hist-scale">
      <span>{signedMw(lo)}</span>
      <span className="zero" style={{ left: `${zero}%` }}>0</span>
      <span>{signedMw(hi)}</span>
    </div>
  );
}

export function Lower({ desk }: { desk: Desk }) {
  const biasScale = Math.max(...desk.byHour.map((hour) => Math.abs(hour.biasMw ?? 0)), 1);
  const counts = desk.histogram.map((bin) => bin.count);
  const countScale = Math.max(...counts, 1);

  return (
    <section className="lower">
      <div>
        <header>
          <h2>Bias by hour</h2>
          <p>Mean forecast minus outturn. In this month it is high at every hour, and a little higher before noon.</p>
        </header>
        <div className="hours" aria-hidden="true">
          {desk.byHour.map((hour) => {
            const bias = hour.biasMw ?? 0;
            const height = `${(Math.abs(bias) / biasScale) * 46}%`;
            return (
              <div key={hour.hour} className="col" title={`${String(hour.hour).padStart(2, "0")}:00 ${signedMw(hour.biasMw)}, absolute error ${mw(hour.maeMw)}`}>
                <span className={bias >= 0 ? "bar up" : "bar down"} style={{ height }} />
                {hour.hour % 6 === 0 ? <em>{String(hour.hour).padStart(2, "0")}</em> : <em />}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <header>
          <h2>Size of the miss</h2>
          <p>Every paired hour. The mass sits above zero: the forecast was more often high than low.</p>
        </header>
        <div className="hist" aria-hidden="true">
          {desk.histogram.map((bin) => (
            <div key={bin.lo} className="col" title={`${signedMw(bin.lo)} to ${signedMw(bin.hi)} · ${bin.count} hours`}>
              <span className={bin.hi <= 0 ? "bar down" : bin.lo >= 0 ? "bar up" : "bar mid"} style={{ height: `${(bin.count / countScale) * 100}%` }} />
            </div>
          ))}
        </div>
        <HistogramScale bins={desk.histogram} />
      </div>
    </section>
  );
}
