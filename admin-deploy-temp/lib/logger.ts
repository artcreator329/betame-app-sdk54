// Logger utility to manage console output and prevent debugger warnings

const isDevelopment = __DEV__;

// Custom logger that respects development vs production environment
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Initialize warning suppression
if (isDevelopment) {
  // Suppress specific React Native warnings that cause the debugger banner
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Filter out common React Native warnings that trigger the debugger banner
      if (message.includes('AsyncStorage has been extracted') ||
          message.includes('ViewPropTypes will be removed') ||
          message.includes('ColorPropType will be removed') ||
          message.includes('requireNativeComponent') ||
          message.includes('Sending') ||
          message.includes('Warning:') ||
          message.includes('Deprecated') ||
          message.includes('Non-serializable values') ||
          message.includes('VirtualizedLists should never be nested') ||
          message.includes('useNativeDriver') ||
          message.includes('componentWillReceiveProps') ||
          message.includes('componentWillMount') ||
          message.includes('componentWillUpdate')) {
        return;
      }
    }
    originalConsoleWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Filter out common React Native errors that trigger the debugger banner
      if (message.includes('AsyncStorage has been extracted') ||
          message.includes('ViewPropTypes will be removed') ||
          message.includes('ColorPropType will be removed') ||
          message.includes('requireNativeComponent') ||
          message.includes('Sending') ||
          message.includes('Warning:') ||
          message.includes('Deprecated')) {
        return;
      }
    }
    originalConsoleError.apply(console, args);
  };
}

export default logger;
