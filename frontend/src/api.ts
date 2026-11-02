import type { Bundle } from "./types";

export async function loadBundle(): Promise<Bundle> {
  const response = await fetch("/api/bundle");
  if (!response.ok) {
    throw new Error(`The desk returned ${response.status}.`);
  }
  return response.json() as Promise<Bundle>;
}
