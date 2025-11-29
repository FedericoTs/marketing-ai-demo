"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IndustryModuleSettings, IndustryModuleType, defaultIndustryModuleSettings } from '@/types/industry-modules';

interface IndustryModuleContextType {
  settings: IndustryModuleSettings;
  updateSettings: (settings: IndustryModuleSettings) => void;
  isModuleEnabled: () => boolean;
  getModuleType: () => IndustryModuleType;
  isFeatureEnabled: (feature: string) => boolean;
}

const IndustryModuleContext = createContext<IndustryModuleContextType | undefined>(undefined);

const STORAGE_KEY = 'industryModuleSettings';

export function IndustryModuleProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<IndustryModuleSettings>(defaultIndustryModuleSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSettings = JSON.parse(saved) as IndustryModuleSettings;
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load industry module settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change
  const updateSettings = (newSettings: IndustryModuleSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save industry module settings:', error);
    }
  };

  // Check if any module is enabled
  const isModuleEnabled = (): boolean => {
    return settings.enabled && settings.type !== null;
  };

  // Get the active module type
  const getModuleType = (): IndustryModuleType => {
    return settings.enabled ? settings.type : null;
  };

  // Check if a specific feature is enabled
  const isFeatureEnabled = (feature: string): boolean => {
    if (!settings.enabled || !settings.type) return false;

    // Check feature based on module type
    switch (settings.type) {
      case 'retail':
        return settings.retail?.[feature as keyof typeof settings.retail] || false;
      case 'healthcare':
        return settings.healthcare?.[feature as keyof typeof settings.healthcare] || false;
      case 'realestate':
        return settings.realestate?.[feature as keyof typeof settings.realestate] || false;
      default:
        return false;
    }
  };

  const contextValue: IndustryModuleContextType = {
    settings,
    updateSettings,
    isModuleEnabled,
    getModuleType,
    isFeatureEnabled,
  };

  // Don't render children until settings are loaded to avoid hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return (
    <IndustryModuleContext.Provider value={contextValue}>
      {children}
    </IndustryModuleContext.Provider>
  );
}

// Safe default context for when IndustryModuleProvider is not present
const defaultContextValue: IndustryModuleContextType = {
  settings: defaultIndustryModuleSettings,
  updateSettings: () => console.warn('IndustryModuleProvider not found - updateSettings is a no-op'),
  isModuleEnabled: () => false,
  getModuleType: () => null,
  isFeatureEnabled: () => false,
};

export function useIndustryModule() {
  const context = useContext(IndustryModuleContext);
  // Return safe default if no provider (makes the hook safe to use anywhere)
  return context ?? defaultContextValue;
}
