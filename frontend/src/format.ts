const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function longDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T12:00:00Z`));
}

export function shortDate(iso: string): string {
  return dayFormat.format(new Date(`${iso}T12:00:00Z`));
}

export function mw(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} MW`;
}

export function signedMw(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "0 MW";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })} MW`;
}

export function gw(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value / 1000).toLocaleString("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} GW`;
}

export function gwh(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} GWh`;
}

export function signedGwh(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (Math.abs(value) < 0.05) return "0.0 GWh";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toLocaleString("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} GWh`;
}

export function percent(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function clock(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(11, 16);
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
