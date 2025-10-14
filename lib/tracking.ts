import { nanoid } from "nanoid";
import { LandingPageData } from "@/types/dm-creative";

const LANDING_PAGES_KEY = "dm-landing-pages";

export function generateTrackingId(): string {
  return nanoid(12);
}

export function storeLandingPageData(data: LandingPageData): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(LANDING_PAGES_KEY);
    const pages: Record<string, LandingPageData> = stored
      ? JSON.parse(stored)
      : {};

    pages[data.trackingId] = data;

    localStorage.setItem(LANDING_PAGES_KEY, JSON.stringify(pages));
  } catch (error) {
    console.error("Error storing landing page data:", error);
  }
}

export function getLandingPageData(
  trackingId: string
): LandingPageData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(LANDING_PAGES_KEY);
    if (!stored) return null;

    const pages: Record<string, LandingPageData> = JSON.parse(stored);
    return pages[trackingId] || null;
  } catch (error) {
    console.error("Error loading landing page data:", error);
    return null;
  }
}

export function incrementPageVisit(trackingId: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(LANDING_PAGES_KEY);
    if (!stored) return;

    const pages: Record<string, LandingPageData> = JSON.parse(stored);
    if (pages[trackingId]) {
      pages[trackingId].visits += 1;
      localStorage.setItem(LANDING_PAGES_KEY, JSON.stringify(pages));
    }
  } catch (error) {
    console.error("Error incrementing page visit:", error);
  }
}

export function getAllLandingPages(): LandingPageData[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(LANDING_PAGES_KEY);
    if (!stored) return [];

    const pages: Record<string, LandingPageData> = JSON.parse(stored);
    return Object.values(pages);
  } catch (error) {
    console.error("Error loading all landing pages:", error);
    return [];
  }
}
