// RevenueCat Test Configuration
// This configuration is for testing IAP while waiting for Apple review

export const REVENUECAT_TEST_CONFIG = {
  // Use your actual RevenueCat API key for testing
  // This will work with StoreKit Configuration file
  IOS_API_KEY: '<REDACTED_REVENUECAT_KEY>',
  
  // Test mode flag - set to true for local testing
  TEST_MODE: true,
  
  // StoreKit Configuration file name (without extension)
  STOREKIT_CONFIG_FILE: 'Configuration',
  
  // App Store Product IDs (must match your StoreKit config)
  PRODUCT_IDS: {
    BETACOINS_20: 'betacoins_20',
    BETACOINS_100: 'betacoins_100',
    BETACOINS_250: 'betacoins_250',
    BETACOINS_600: 'betacoins_600',
    BETACOINS_1000: 'betacoins_1000',
    BETACOINS_2000: 'betacoins_2000',
  },
  
  // BetaCoin amounts for each product
  BETACOIN_AMOUNTS: {
    'betacoins_20': 20,
    'betacoins_100': 100,
    'betacoins_250': 250,
    'betacoins_600': 600,
    'betacoins_1000': 1000,
    'betacoins_2000': 2000,
  },
  
  // Test pricing (matches StoreKit config)
  PRICING: {
    'betacoins_20': 4.90,
    'betacoins_100': 19.90,
    'betacoins_250': 34.90,
    'betacoins_600': 79.90,
    'betacoins_1000': 99.90,
    'betacoins_2000': 179.90,
  },
};

// Helper function to get test API key
export function getRevenueCatTestApiKey(): string {
  return REVENUECAT_TEST_CONFIG.IOS_API_KEY;
}

// Helper function to check if in test mode
export function isTestMode(): boolean {
  return REVENUECAT_TEST_CONFIG.TEST_MODE;
}




