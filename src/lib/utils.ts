import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MasteryStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMasteryColor(status: string): string {
  switch (status) {
    case "mastered": return "var(--color-mastered)";
    case "learning": return "var(--color-learning)";
    case "weak": return "var(--color-weak)";
    default: return "var(--color-not-started)";
  }
}

export function getMasteryLabel(status: string): string {
  switch (status) {
    case "mastered": return "Mastered";
    case "learning": return "Learning";
    case "weak": return "Needs Work";
    default: return "Not Started";
  }
}

export function getMasteryBadgeClass(status: string): string {
  switch (status) {
    case "mastered": return "badge-mastered";
    case "learning": return "badge-learning";
    case "weak": return "badge-weak";
    default: return "badge-not-started";
  }
}

export function calculateMasteryStatus(score: number): MasteryStatus {
  if (score >= 85) return "mastered";
  if (score >= 50) return "learning";
  if (score > 0) return "weak";
  return "not_started";
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
