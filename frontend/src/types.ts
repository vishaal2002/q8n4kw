export type GateId = "epex" | "n2ex" | "hh";

export interface Gate {
  id: GateId;
  name: string;
  closeGmt: string;
  note: string;
}

export interface Half {
  start: string;
  settlementPeriod: number;
  generationMw: number;
}

export interface Hour {
  start: string;
  hour: number;
  forecastMw: number | null;
  publishTime: string | null;
  actualMw: number | null;
  errorMw: number | null;
  haircutMw: number | null;
  countedMw: number | null;
  halves: Half[];
}

export interface Day {
  date: string;
  decisionDate: string;
  maeMw: number | null;
  biasMw: number | null;
  meanForecastMw: number | null;
  meanActualMw: number | null;
  energyForecastGwh: number | null;
  energyActualGwh: number | null;
  pairedHours: number;
  publishGmt: string | null;
  publishShare: number | null;
  hours: Hour[];
}

export interface Desk {
  gate: Gate;
  month: string;
  source: {
    publishClocksGmt: string[];
    typicalPublishGmt: string | null;
    typicalPublishShare: number | null;
    exceptions: { date: string; publishGmt: string | null }[];
  };
  score: {
    hours: number;
    expectedHours: number;
    maeMw: number | null;
    rmseMw: number | null;
    biasMw: number | null;
    wape: number | null;
    correlation: number | null;
    persistenceMaeMw: number | null;
    skill: number | null;
    p10Mw: number | null;
    p90Mw: number | null;
    energyErrorGwh: number | null;
    meanForecastMw: number | null;
    meanActualMw: number | null;
    withinHourSpreadMw: number | null;
  };
  cover: {
    minHistory: number;
    quantile: number;
    hoursScored: number;
    coverage: number | null;
    meanHaircutMw: number | null;
    extraEnergyGwh: number | null;
  };
  revision: null | {
    fromGate: GateId;
    fromName: string;
    meanRevisionMw: number;
    meanAbsRevisionMw: number;
    largestUp: { date: string; revisionMw: number };
    largestDown: { date: string; revisionMw: number };
  };
  byHour: {
    hour: number;
    hours: number;
    maeMw: number | null;
    biasMw: number | null;
    p90Mw: number | null;
  }[];
  histogram: { lo: number; hi: number; count: number }[];
  days: Day[];
}

export interface Bundle {
  gates: Record<GateId, Desk>;
}
