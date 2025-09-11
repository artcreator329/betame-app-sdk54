import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAppVersionInfo, AppVersionInfo } from '@/utils/version-utils';

interface VersionContextType {
  versionInfo: AppVersionInfo;
  refreshVersionInfo: () => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>(() => getAppVersionInfo());

  const refreshVersionInfo = () => {
    setVersionInfo(getAppVersionInfo());
  };

  // Refresh version info when the app comes to foreground
  useEffect(() => {
    refreshVersionInfo();
  }, []);

  return (
    <VersionContext.Provider value={{ versionInfo, refreshVersionInfo }}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
}