import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '../types/settings';
import { localStore, INITIAL_SETTINGS } from '../lib/storage';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleIpi: () => void;
  toggleIcms: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    return localStore.getSettings();
  });

  useEffect(() => {
    const loaded = localStore.getSettings();
    if (loaded) setSettings(loaded);
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const updated = localStore.saveSettings({ ...settings, ...updates });
    setSettings(updated);
  };

  const toggleIpi = () => {
    updateSettings({ include_ipi_in_total: !settings.include_ipi_in_total });
  };

  const toggleIcms = () => {
    updateSettings({ include_icms_in_total: !settings.include_icms_in_total });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        toggleIpi,
        toggleIcms,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
