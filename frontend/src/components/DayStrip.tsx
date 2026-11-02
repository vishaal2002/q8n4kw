import type { Day } from "../types";
import { signedMw } from "../format";

interface Props {
  days: Day[];
  selected: string;
  onSelect: (date: string) => void;
}

export function DayStrip({ days, selected, onSelect }: Props) {
  const scale = Math.max(...days.map((day) => Math.abs(day.biasMw ?? 0)), 1);
  return (
    <div className="strip-wrap">
      <div className="strip-caption">
        <span>Forecast minus outturn, daily average</span>
        <span>Above the line, the book was short of wind</span>
      </div>
      <div className="strip" role="listbox" aria-label="Delivery days in January 2026" aria-activedescendant={selected}>
        {days.map((day) => {
          const bias = day.biasMw ?? 0;
          const height = `${(Math.abs(bias) / scale) * 46}%`;
          const up = bias >= 0;
          return (
            <button
              key={day.date}
              id={day.date}
              type="button"
              role="option"
              aria-selected={day.date === selected}
              aria-label={`${day.date}, ${signedMw(day.biasMw)}`}
              onClick={() => onSelect(day.date)}
            >
              <span className="plot">
                <span className={up ? "bar up" : "bar down"} style={{ height }} />
              </span>
              <span className="n">{Number(day.date.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
