"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CompanySettings, defaultSettings } from "@/types/settings";
import { getSettings, saveSettings } from "@/lib/storage";

interface SettingsContextType {
  settings: CompanySettings;
  updateSettings: (settings: CompanySettings) => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    setIsLoaded(true);
  }, []);

  const updateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
