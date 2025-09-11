import Constants from 'expo-constants';
import * as Application from 'expo-application';

export interface AppVersionInfo {
  version: string;
  buildNumber: string;
  fullVersion: string;
  displayVersion: string;
}

/**
 * Get comprehensive version information for the app
 */
export const getAppVersionInfo = (): AppVersionInfo => {
  // Get version from app.json/expo config
  const version = Constants.expoConfig?.version || '1.0.0';
  
  // Get platform-specific build numbers
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber || '1';
  const androidVersionCode = Constants.expoConfig?.android?.versionCode?.toString() || '1';
  
  // Use native build version if available (for production builds)
  const nativeBuildVersion = Application.nativeBuildVersion;
  
  // Determine the appropriate build number based on platform
  let buildNumber: string;
  if (nativeBuildVersion) {
    buildNumber = nativeBuildVersion;
  } else if (Constants.platform?.ios) {
    buildNumber = iosBuildNumber;
  } else if (Constants.platform?.android) {
    buildNumber = androidVersionCode;
  } else {
    // Web or other platforms
    buildNumber = '1';
  }
  
  // Create full version string (e.g., "1.0.1 (12)")
  const fullVersion = `${version} (${buildNumber})`;
  
  // Create display version for UI (e.g., "BetaMe v1.0.1")
  const displayVersion = `BetaMe v${version}`;
  
  return {
    version,
    buildNumber,
    fullVersion,
    displayVersion
  };
};

/**
 * Get just the display version string for UI
 */
export const getDisplayVersion = (): string => {
  return getAppVersionInfo().displayVersion;
};

/**
 * Get the full version with build number for debugging
 */
export const getFullVersion = (): string => {
  return getAppVersionInfo().fullVersion;
};

/**
 * Check if this is a development build
 */
export const isDevelopmentBuild = (): boolean => {
  return __DEV__ || Constants.appOwnership === 'expo';
};

/**
 * Get version info for support/debugging purposes
 */
export const getDebugVersionInfo = () => {
  const versionInfo = getAppVersionInfo();
  
  return {
    ...versionInfo,
    isDevelopment: isDevelopmentBuild(),
    platform: Constants.platform,
    expoVersion: Constants.expoVersion,
    nativeAppVersion: Application.nativeApplicationVersion,
    nativeBuildVersion: Application.nativeBuildVersion,
  };
};