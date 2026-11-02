import type { Day, Desk } from "./types";
import { gwh, gw, longDate, mw, percent, signedMw } from "./format";

export function decisionSentence(day: Day, desk: Desk): string {
  const run = day.publishGmt ? `the ${day.publishGmt} run` : "no published run";
  return `On ${longDate(day.decisionDate)} the ${desk.gate.name} book closed at ${desk.gate.closeGmt} GMT. The newest national forecast already published was ${run}, and it put ${longDate(day.date)} at ${gw(day.meanForecastMw)}.`;
}

export function resultSentence(day: Day): string {
  if (day.biasMw == null || day.meanActualMw == null) {
    return "This delivery day has no paired forecast and outturn.";
  }
  const outturn = `Outturn was ${gw(day.meanActualMw)}.`;
  if (Math.abs(day.biasMw) < 50) {
    return `${outturn} On the average of the day, the run and the wind agreed.`;
  }
  if (day.biasMw > 0) {
    return `${outturn} The run was ${gw(day.biasMw)} high, so a book filled to match it was short of wind.`;
  }
  return `${outturn} The run was ${gw(Math.abs(day.biasMw))} low, so a book filled to match it was long.`;
}

export function runLine(desk: Desk): string {
  const { typicalPublishGmt, typicalPublishShare } = desk.source;
  if (!typicalPublishGmt || typicalPublishShare == null) return "";
  const share = Math.round(typicalPublishShare * 100);
  if (share >= 99) return `Every paired hour in this book used the ${typicalPublishGmt} GMT run.`;
  return `${share}% of paired hours in this book used the ${typicalPublishGmt} GMT run.`;
}

export function coverSentence(desk: Desk): string {
  const { cover } = desk;
  if (cover.coverage == null || cover.meanHaircutMw == null || cover.extraEnergyGwh == null) {
    return "There is not yet enough settled history to score a haircut.";
  }
  return `A 90% haircut, learned only from earlier deliveries of the same hour, averaged ${mw(cover.meanHaircutMw)}. Counted wind held on ${percent(cover.coverage)} of the hours it was applied to. That buffer is ${gwh(cover.extraEnergyGwh)} of extra firm energy, wider than the average miss.`;
}

export function revisionSentence(desk: Desk): string | null {
  const revision = desk.revision;
  if (!revision) return null;
  const quiet = Math.abs(revision.meanRevisionMw) < revision.meanAbsRevisionMw * 0.25;
  const upBigger = Math.abs(revision.largestUp.revisionMw) >= Math.abs(revision.largestDown.revisionMw);
  const extreme = upBigger ? revision.largestUp : revision.largestDown;
  const average = quiet
    ? `the later run moved a delivery day by ${mw(revision.meanAbsRevisionMw)} on average, without a consistent direction`
    : `the later run moved the day ${revision.meanRevisionMw > 0 ? "up" : "down"} by ${mw(Math.abs(revision.meanRevisionMw))} on average`;
  return `Relative to the ${revision.fromName} book, ${average}. The largest move was ${signedMw(extreme.revisionMw)} on ${longDate(extreme.date)}.`;
}

export function exceptionLine(desk: Desk): string | null {
  if (desk.source.exceptions.length === 0) return null;
  const listed = desk.source.exceptions
    .map((item) => `${longDate(item.date)} held the ${item.publishGmt} run`)
    .join("; ");
  return `Off the usual clock: ${listed}.`;
}

export function biasWord(biasMw: number | null): string {
  if (biasMw == null || Math.abs(biasMw) < 50) return "Level with outturn";
  return biasMw > 0 ? "High · short of wind" : "Low · long of wind";
}
