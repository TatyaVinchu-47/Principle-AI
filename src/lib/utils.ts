import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Human-friendly "time ago" string. Emphasizes freshness, which is a core
 * product principle ("How fresh is this job?").
 */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "unknown";
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${Math.max(seconds, 1)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Returns true when posted within the last `hours` (defaults to 48h). */
export function isFresh(input: string | Date | null | undefined, hours = 48): boolean {
  if (!input) return false;
  const date = typeof input === "string" ? new Date(input) : input;
  return Date.now() - date.getTime() < hours * 60 * 60 * 1000;
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "INR",
  period: string | null = "month",
): string | null {
  if (!min && !max) return null;
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  const fmt = (n: number) => {
    if (currency === "INR") {
      if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    }
    return n.toLocaleString("en-IN");
  };
  const suffix = period ? `/${period}` : "";
  if (min && max) return `${symbol}${fmt(min)}–${symbol}${fmt(max)}${suffix}`;
  return `${symbol}${fmt((min || max)!)}${suffix}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Clamp a number to the 0..100 range and round it. */
export function clampScore(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
