import { CompanySettings, defaultSettings } from "@/types/settings";

const SETTINGS_KEY = "marketing-ai-settings";

export function getSettings(): CompanySettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }

  return defaultSettings;
}

export function saveSettings(settings: CompanySettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export function clearSettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error("Error clearing settings:", error);
  }
}
