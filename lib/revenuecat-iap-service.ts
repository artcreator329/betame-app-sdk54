import { Platform } from 'react-native';
import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo, 
  LOG_LEVEL,
  PurchasesStoreProduct,
  MakePurchaseResult,
  PURCHASE_TYPE
} from 'react-native-purchases';
import { WalletService } from './wallet-service';
import { getRevenueCatApiKey } from '@/config/revenuecat';

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  betacoinAmount: number;
  package?: PurchasesPackage;
  storeProduct?: PurchasesStoreProduct;
}

export interface IAPPurchaseResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  betacoinAmount?: number;
}

export interface PendingPurchase {
  transactionId: string;
  productId: string;
  userId: string;
  timestamp: number;
  betacoinAmount: number;
}

export class RevenueCatIAPService {
  private static instance: RevenueCatIAPService;
  private isInitialized = false;
  private products: IAPProduct[] = [];
  private currentOffering: PurchasesOffering | null = null;

  // Product IDs for iOS App Store Connect
  private readonly productIds = [
    'betacoins_new_20',    // 20 BetaCoins for RM4.90
    'betacoins_new_100',   // 100 BetaCoins for RM19.90
  ];

  // Product mapping to BetaCoin amounts
  private readonly productMapping: Record<string, number> = {
    'betacoins_new_20': 20,
    'betacoins_new_100': 100,
  };

  // RevenueCat API Key from configuration
  private readonly apiKey: <REDACTED>();

  static getInstance(): RevenueCatIAPService {
    if (!RevenueCatIAPService.instance) {
      RevenueCatIAPService.instance = new RevenueCatIAPService();
    }
    return RevenueCatIAPService.instance;
  }

  /**
   * Initialize RevenueCat service (iOS only)
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('📱 RevenueCat IAP service not available on this platform');
      return false;
    }

    if (!this.apiKey) {
      console.log('❌ RevenueCat API key not configured');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🔧 Initializing RevenueCat IAP service for iOS...');
      
      // Configure RevenueCat with your iOS API key
      Purchases.configure({
        apiKey: this.apiKey,
        appUserID: null, // Will be set when user logs in
      });

      // Enable debug logging for troubleshooting
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      
      console.log('🔍 RevenueCat configured for production mode');

      // Set up purchase listener
      Purchases.addCustomerInfoUpdateListener(this.handleCustomerInfoUpdate);

      // Load products
      await this.loadProducts();

      this.isInitialized = true;
      console.log('✅ RevenueCat IAP service initialized successfully for iOS');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat IAP service:', error);
      return false;
    }
  }

  /**
   * Set the current user ID for RevenueCat
   */
  async setUser(userId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('👤 Setting RevenueCat user ID:', userId);
      
      // Use logIn to associate the user with RevenueCat
      const { customerInfo } = await Purchases.logIn(userId);
      
      console.log('✅ RevenueCat user ID set successfully');
      console.log('   Original App User ID:', customerInfo.originalAppUserId);
      console.log('   Current App User ID:', userId);
      
      // Verify the user ID was set correctly
      if (customerInfo.originalAppUserId !== userId && !customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
        console.warn('⚠️ RevenueCat user ID mismatch - this may cause issues');
      }
    } catch (error) {
      console.error('❌ Error setting RevenueCat user ID:', error);
      throw error; // Re-throw to handle in calling code
    }
  }

  /**
   * Force refresh products from RevenueCat
   */
  async refreshProducts(): Promise<void> {
    console.log('🔄 Force refreshing products from RevenueCat...');
    try {
      // Invalidate cache and reload
      await Purchases.invalidateCustomerInfoCache();
      await this.loadProducts();
    } catch (error) {
      console.error('❌ Error refreshing products:', error);
    }
  }

  /**
   * Load products with proper device-specific strategy
   */
  private async loadProducts(): Promise<void> {
    console.log('🔍 Loading products with device-appropriate strategy...');
    
    // Check if we're in TestFlight
    const isTestFlight = await this.isTestFlightBuild();
    if (isTestFlight) {
      console.log('🚀 TestFlight build detected - using special handling');
    }
    
    // Strategy 1: Try RevenueCat offerings first (works when products are approved)
    const offeringsSuccess = await this.loadFromRevenueCatOfferings();
    if (offeringsSuccess) {
      console.log('✅ Products loaded from RevenueCat offerings (Production ready)');
      return;
    }

    // Strategy 2: Try direct App Store loading (works with sandbox accounts)
    console.log('🛒 RevenueCat offerings failed, trying direct App Store connection...');
    const appStoreSuccess = await this.loadFromAppStore();
    if (appStoreSuccess) {
      console.log('✅ Products loaded from App Store (Sandbox mode)');
      return;
    }

    // Strategy 3: For TestFlight or simulator, always load StoreKit Configuration as fallback
    if (isTestFlight || Platform.OS === 'ios') {
      console.log('🧪 Loading StoreKit Configuration for TestFlight/testing...');
      const storekitSuccess = await this.loadFromStoreKitConfiguration();
      if (storekitSuccess) {
        console.log('✅ Products loaded from StoreKit Configuration (TestFlight/Apple Review)');
        return;
      }
    }

    // No products available
    console.log('❌ No products available for purchase');
    console.log('   Real device requires:');
    console.log('   1. Sandbox Apple ID signed in, OR');
    console.log('   2. Approved products in App Store Connect');
    console.log('   Simulator can use StoreKit Configuration file');
    this.products = []; // Empty products array - no purchases possible
  }

  /**
   * Try to load products from RevenueCat offerings (when dashboard is configured)
   */
  private async loadFromRevenueCatOfferings(): Promise<boolean> {
    try {
      console.log('🔄 Trying RevenueCat offerings (checking dashboard configuration)...');
      const offerings = await Purchases.getOfferings();
      this.currentOffering = offerings.current;

      if (this.currentOffering && this.currentOffering.availablePackages.length > 0) {
        console.log(`📋 Found offering with ${this.currentOffering.availablePackages.length} packages`);
        
        // Convert RevenueCat packages to our format
        this.products = this.currentOffering.availablePackages.map((pkg) => {
          const productId = pkg.identifier;
          const betacoinAmount = this.productMapping[productId] || 0;
          
          return {
            productId: productId,
            title: `${betacoinAmount} BetaCoins`,
            description: `Purchase ${betacoinAmount} BetaCoins`,
            price: pkg.storeProduct?.priceString || `RM${this.getFallbackPrice(productId).toFixed(2)}`,
            priceAmount: pkg.storeProduct?.price || this.getFallbackPrice(productId),
            currency: pkg.storeProduct?.currencyCode || 'MYR',
            betacoinAmount,
            package: pkg,
            storeProduct: pkg.storeProduct,
          };
        });
        
        console.log('✅ Products loaded from RevenueCat offerings:', this.products.length);
        console.log('📋 Available products:', this.products.map(p => `${p.productId}: ${p.betacoinAmount} BetaCoins - ${p.price}`));
        return true;
      } else {
        console.log('⚠️ No RevenueCat offerings found');
        console.log('   This means products are not configured in RevenueCat dashboard');
        console.log('   Run: node scripts/fix-revenuecat-configuration.js for setup guide');
        return false;
      }
    } catch (error: any) {
      console.log('⚠️ RevenueCat offerings failed:', error?.message || error);
      
      // Check for specific RevenueCat configuration errors
      if (error?.message?.includes('None of the products')) {
        console.log('🔧 Configuration Issue Detected:');
        console.log('   Products exist in RevenueCat dashboard but cannot be fetched from App Store Connect');
        console.log('   Common causes:');
        console.log('   1. Products are not APPROVED in App Store Connect');
        console.log('   2. Products are in "Ready to Submit" status instead of "Approved"');
        console.log('   3. App needs to be submitted for review with in-app purchases');
        console.log('   Solution: Check App Store Connect product approval status');
      }
      
      return false;
    }
  }

  /**
   * Try to load products from StoreKit Configuration file (for App Review compatibility)
   * This method allows the app to show purchase flow during Apple Review process
   */
  private async loadFromStoreKitConfiguration(): Promise<boolean> {
    try {
      console.log('🧪 Loading products from StoreKit Configuration file...');
      console.log('   This enables purchase flow for Apple Review process');
      
      // Create products based on StoreKit configuration
      // These match the products in your BetaCoins.storekit file
      this.products = [
        {
          productId: 'betacoins_new_20',
          title: '20 BetaCoins Pack',
          description: 'Purchase 20 BetaCoins to boost your services and unlock premium features',
          price: 'RM4.90',
          priceAmount: 4.90,
          currency: 'MYR',
          betacoinAmount: 20,
          package: undefined, // No RevenueCat package
          storeProduct: undefined, // Will be populated when actual purchase happens
        },
        {
          productId: 'betacoins_new_100',
          title: '100 BetaCoins Pack', 
          description: 'Purchase 100 BetaCoins to boost your services and unlock premium features',
          price: 'RM19.90',
          priceAmount: 19.90,
          currency: 'MYR',
          betacoinAmount: 100,
          package: undefined, // No RevenueCat package
          storeProduct: undefined, // Will be populated when actual purchase happens
        }
      ];

      console.log('✅ StoreKit Configuration products loaded successfully');
      console.log('📋 Available products:', this.products.map(p => `${p.productId}: ${p.betacoinAmount} BetaCoins - ${p.price}`));
      console.log('🍎 This allows Apple reviewers to see the purchase flow');
      
      return true;
    } catch (error) {
      console.error('❌ Error loading from StoreKit Configuration:', error);
      return false;
    }
  }

  /**
   * Get fallback price for a product ID
   */
  private getFallbackPrice(productId: string): number {
    const fallbackPrices: Record<string, number> = {
      'betacoins_new_20': 4.90,
      'betacoins_new_100': 19.90,
    };
    return fallbackPrices[productId] || 0;
  }

  /**
   * Try to load products directly from App Store (for sandbox testing)
   */
  private async loadFromAppStore(): Promise<boolean> {
    try {
      console.log('🛒 Loading products directly from App Store for sandbox testing...');
      
      // Get products directly from App Store - this works in sandbox mode
      const products = await Purchases.getProducts(this.productIds);
      
      if (products && products.length > 0) {
        console.log(`🎉 Found ${products.length} products from App Store!`);
        
        this.products = products.map((product) => {
          const betacoinAmount = this.productMapping[product.identifier] || 0;
          console.log(`📦 App Store Product: ${product.identifier} - ${product.title} - ${product.priceString}`);
          
          return {
            productId: product.identifier,
            title: product.title || `${betacoinAmount} BetaCoins`,
            description: product.description || `Purchase ${betacoinAmount} BetaCoins`,
            price: product.priceString || `RM${this.getFallbackPrice(product.identifier).toFixed(2)}`,
            priceAmount: product.price || this.getFallbackPrice(product.identifier),
            currency: product.currencyCode || 'MYR',
            betacoinAmount,
            storeProduct: product,
            package: undefined, // No RevenueCat package for direct App Store
          };
        });
        
        console.log('✅ Products loaded from App Store:', this.products.length);
        console.log('📋 Available products:', this.products.map(p => `${p.productId}: ${p.betacoinAmount} BetaCoins - ${p.price}`));
        return true;
      } else {
        console.log('⚠️ No products returned from App Store');
        console.log('   This means products are not approved in App Store Connect');
        console.log('   Or RevenueCat is not properly configured');
      }
    } catch (error) {
      console.log('❌ Error loading from App Store:', error);
      console.log('   Make sure products are approved in App Store Connect');
    }
    
    return false;
  }



  /**
   * Handle customer info updates
   */
  private handleCustomerInfoUpdate = (customerInfo: CustomerInfo): void => {
    console.log('👤 Customer info updated:', customerInfo);
    
    // Check for any new purchases that need to be processed
    this.processNewPurchases(customerInfo);
  };

  /**
   * Check if app is running in TestFlight
   */
  private async isTestFlightBuild(): Promise<boolean> {
    try {
      // Check if we're in TestFlight using RevenueCat
      const customerInfo = await Purchases.getCustomerInfo();
      // In TestFlight, managementURL is present
      return !!(customerInfo.managementURL);
    } catch (error) {
      console.log('⚠️ Could not determine TestFlight status:', error);
      return false;
    }
  }

  /**
   * Process any new purchases from customer info
   */
  private async processNewPurchases(customerInfo: CustomerInfo): Promise<void> {
    try {
      console.log('🔄 Processing new purchases...');
      
      // Check for active entitlements (this is the modern way)
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      console.log('Active entitlements:', activeEntitlements);

      // Process any active entitlements
      for (const entitlementId of activeEntitlements) {
        const entitlement = customerInfo.entitlements.active[entitlementId];
        if (entitlement && entitlement.productIdentifier) {
          // Try to get the actual user ID from the current context
          // This will use the anonymous ID as fallback but warn about it
          await this.processBetaCoinPurchase(entitlement.productIdentifier);
        }
      }

      // Also check latest transaction if available
      if (customerInfo.latestExpirationDate) {
        console.log('Latest expiration date:', customerInfo.latestExpirationDate);
      }
    } catch (error) {
      console.error('❌ Error processing new purchases:', error);
    }
  }

  /**
   * Process a BetaCoin purchase
   */
  private async processBetaCoinPurchase(productId: string, actualUserId?: string): Promise<void> {
    try {
      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        console.error('❌ Product not found for purchase:', productId);
        return;
      }

      // Use the actual user ID passed from purchase, not RevenueCat's anonymous ID
      let userId = actualUserId;
      
      if (!userId) {
        // Fallback to RevenueCat user ID if no actual user ID provided
        const customerInfo = await Purchases.getCustomerInfo();
        userId = customerInfo.originalAppUserId;
        
        // Check if it's an anonymous ID and warn
        if (userId && userId.startsWith('$RCAnonymousID:')) {
          console.warn('⚠️ Using RevenueCat anonymous ID - this may cause wallet lookup issues');
          console.warn('   Anonymous ID:', userId);
        }
      }

      if (!userId) {
        console.error('❌ No user ID found for purchase');
        return;
      }

      console.log(`✅ Processing BetaCoin purchase: ${product.betacoinAmount} BetaCoins for user ${userId}`);

      // Add BetaCoins to user's wallet
      const result = await WalletService.addBetaCoins(
        userId,
        product.betacoinAmount,
        {
          transactionAmount: product.priceAmount,
          processingFee: 0,
          baseAmount: product.betacoinAmount,
        }
      );

      if (result.success) {
        console.log(`✅ BetaCoins added to wallet: ${product.betacoinAmount} BetaCoins`);
        
        // Mark the purchase as consumed
        await Purchases.invalidateCustomerInfoCache();
      } else {
        console.error('❌ Failed to add BetaCoins to wallet:', result.error);
      }
    } catch (error) {
      console.error('❌ Error processing BetaCoin purchase:', error);
    }
  }

  /**
   * Get available products
   */
  getProducts(): IAPProduct[] {
    return this.products;
  }

  /**
   * Purchase via RevenueCat package (TestFlight/Production)
   */
  private async purchaseViaRevenueCatPackage(
    rcPackage: PurchasesPackage, 
    productId: string, 
    userId: string
  ): Promise<IAPPurchaseResult> {
    try {
      console.log(`🛒 Purchasing via RevenueCat package: ${productId}`);
      
      // Purchase the package through RevenueCat
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(rcPackage);
      
      if (productIdentifier === productId) {
        console.log('✅ RevenueCat package purchase successful:', productId);
        
        // Process the purchase with the actual user ID
        await this.processBetaCoinPurchase(productId, userId);
        
        return {
          success: true,
          transactionId: customerInfo.originalAppUserId,
          betacoinAmount: this.productMapping[productId] || 0
        };
      } else {
        return {
          success: false,
          error: 'Product identifier mismatch'
        };
      }
    } catch (error: unknown) {
      console.error('❌ RevenueCat package purchase failed:', error);
      
      // Handle different error types
      let errorMessage = 'Purchase failed';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('cancelled')) {
          errorMessage = 'Purchase cancelled by user';
        } else {
          errorMessage = errorMsg;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Purchase a product directly from App Store (Sandbox testing)
   */
  private async purchaseDirectFromAppStore(productId: string, userId: string): Promise<IAPPurchaseResult> {
    try {
      console.log(`🛒 Purchasing ${productId} directly from App Store...`);
      
      // First check if the product exists in our loaded products
      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        console.error(`❌ Product ${productId} not found in loaded products`);
        return {
          success: false,
          error: 'Product not available for purchase'
        };
      }
      
      // Use the modern purchaseStoreProduct method if we have a store product
      let result: MakePurchaseResult;
      
      if (product.storeProduct) {
        console.log('🛒 Using purchaseStoreProduct method...');
        result = await Purchases.purchaseStoreProduct(product.storeProduct);
      } else {
        console.log('🛒 Using legacy purchaseProduct method...');
        result = await Purchases.purchaseProduct(productId, null, PURCHASE_TYPE.INAPP);
      }
      
      const { customerInfo, productIdentifier } = result;
      
      if (productIdentifier === productId) {
        console.log('✅ App Store purchase successful:', productId);
        
        // Process the purchase manually with the actual user ID
        await this.processBetaCoinPurchase(productId, userId);
        
        return {
          success: true,
          transactionId: customerInfo.originalAppUserId,
          betacoinAmount: this.productMapping[productId] || 0
        };
      } else {
        return {
          success: false,
          error: 'Product identifier mismatch'
        };
      }
    } catch (error: unknown) {
      console.error('❌ App Store purchase failed:', error);
      
      // Handle different error types
      let errorMessage = 'Purchase failed';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('Couldn\'t find product')) {
          errorMessage = 'Product not available in App Store Connect';
        } else if (errorMsg.includes('cancelled')) {
          errorMessage = 'Purchase cancelled by user';
        } else {
          errorMessage = errorMsg;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Purchase from StoreKit Configuration (for App Review compatibility)
   * This method allows the purchase flow to work during Apple Review
   */
  private async purchaseFromStoreKitConfiguration(productId: string, userId: string): Promise<IAPPurchaseResult> {
    try {
      console.log(`🧪 Attempting purchase from StoreKit Configuration for ${productId}...`);
      console.log('   This enables purchase flow for Apple Review process and TestFlight');
      
      // First, try to get the product again to ensure it's available
      const products = await Purchases.getProducts([productId]);
      
      if (products && products.length > 0) {
        console.log('✅ Product found in App Store:', productId);
        const product = products[0];
        
        // Try to purchase using the found product
        const result = await Purchases.purchaseStoreProduct(product);
        const { customerInfo, productIdentifier } = result;
        
        if (productIdentifier === productId) {
          console.log('✅ StoreKit purchase successful:', productId);
          
          // Process the purchase manually with the actual user ID
          await this.processBetaCoinPurchase(productId, userId);
          
          return {
            success: true,
            transactionId: customerInfo.originalAppUserId,
            betacoinAmount: this.productMapping[productId] || 0
          };
        }
      } else {
        // If product not found, try direct purchase anyway (for StoreKit Configuration)
        console.log('⚠️ Product not found, attempting direct purchase...');
        const result = await Purchases.purchaseProduct(productId, null, PURCHASE_TYPE.INAPP);
        const { customerInfo, productIdentifier } = result;
        
        if (productIdentifier === productId) {
          console.log('✅ Direct purchase successful:', productId);
          
          // Process the purchase manually with the actual user ID
          await this.processBetaCoinPurchase(productId, userId);
          
          return {
            success: true,
            transactionId: customerInfo.originalAppUserId,
            betacoinAmount: this.productMapping[productId] || 0
          };
        }
      }
      
      return {
        success: false,
        error: 'Product purchase failed'
      };
      
    } catch (error: unknown) {
      console.error('❌ StoreKit Configuration purchase failed:', error);
      
      // Handle different error types
      let errorMessage = 'Purchase failed';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('cancelled')) {
          errorMessage = 'Purchase cancelled by user';
        } else if (errorMsg.includes('Couldn\'t find product')) {
          console.log('🔧 Product not found - checking configuration...');
          console.log('   1. Ensure products are added to App Store Connect');
          console.log('   2. For TestFlight: Submit products with app version');
          console.log('   3. Check sandbox account is signed in');
          errorMessage = 'Product not available. Please ensure you are signed in with a sandbox account.';
        } else {
          errorMessage = errorMsg;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Purchase a product through RevenueCat
   */
  async purchaseProduct(productId: string, userId: string): Promise<IAPPurchaseResult> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Failed to initialize IAP service'
          };
        }
      }

      // Set the user ID if not already set
      await this.setUser(userId);

      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        console.error(`❌ Product not found: ${productId}`);
        console.log('📋 Available products:', this.products.map(p => p.productId));
        return {
          success: false,
          error: `Product not found: ${productId}. Available: ${this.products.map(p => p.productId).join(', ')}`
        };
      }

      // Check if we're in TestFlight
      const isTestFlight = await this.isTestFlightBuild();
      
      // Handle different purchase methods based on product source
      if (product.package) {
        console.log(`🛒 Using RevenueCat package for ${productId} (Production)...`);
        return await this.purchaseViaRevenueCatPackage(product.package, productId, userId);
      } else if (product.storeProduct) {
        console.log(`🛒 Using direct App Store purchase for ${productId} (Sandbox)...`);
        return await this.purchaseDirectFromAppStore(productId, userId);
      } else if (isTestFlight) {
        // For TestFlight, try StoreKit Configuration purchase
        console.log(`🚀 TestFlight detected - using StoreKit Configuration for ${productId}...`);
        return await this.purchaseFromStoreKitConfiguration(productId, userId);
      } else {
        // No valid purchase method available
        console.log(`❌ No valid purchase method for ${productId}`);
        console.log('   Product has no RevenueCat package or App Store product');
        console.log('   This means:');
        console.log('   1. Real device needs sandbox Apple ID, OR');
        console.log('   2. Products need approval in App Store Connect, OR');
        console.log('   3. Simulator can use StoreKit Configuration');
        
        return {
          success: false,
          error: 'Purchase not available. Real device requires sandbox Apple ID or approved products.'
        };
      }
      
    } catch (error: unknown) {
      console.error('❌ Purchase error:', error);
      
      // Handle error properly
      let errorMessage = 'Purchase failed';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }



  /**
   * Restore purchases from App Store/Google Play
   */
  async restorePurchases(): Promise<boolean> {
    try {
      console.log('🔄 Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Purchases restored:', customerInfo);

      // Process any restored purchases
      await this.processNewPurchases(customerInfo);

      return true;
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return false;
    }
  }

  /**
   * Get customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('❌ Error getting customer info:', error);
      return null;
    }
  }

  /**
   * Check if user has active purchases
   */
  async hasActivePurchases(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return false;

      // Check active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      return activeEntitlements.length > 0;
    } catch (error) {
      console.error('❌ Error checking active purchases:', error);
      return false;
    }
  }

  /**
   * Check if IAP is available and working
   */
  async isIAPAvailable(): Promise<{ available: boolean; reason?: string }> {
    if (Platform.OS !== 'ios') {
      return { available: false, reason: 'IAP only available on iOS' };
    }

    if (!this.apiKey) {
      return { available: false, reason: 'RevenueCat API key not configured' };
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { available: false, reason: 'Failed to initialize RevenueCat' };
      }
    }

    if (this.products.length === 0) {
      return { 
        available: false, 
        reason: 'No products available. Products may be waiting for Apple approval.' 
      };
    }

    return { available: true };
  }

  /**
   * Get IAP status for user display
   */
  async getIAPStatus(): Promise<{
    available: boolean;
    message: string;
    canPurchase: boolean;
    alternativeMethod?: string;
  }> {
    const { available, reason } = await this.isIAPAvailable();

    if (!available) {
      return {
        available: false,
        message: reason || 'In-app purchases not available',
        canPurchase: false,
        alternativeMethod: Platform.OS === 'ios' ? 'web' : 'curlec'
      };
    }

    // Check if we have any products that might work
    const workingProducts = this.products.filter(p => p.productId && p.betacoinAmount > 0);
    
    if (workingProducts.length === 0) {
      return {
        available: false,
        message: 'Products are being reviewed by Apple. Please try again later or use web payment.',
        canPurchase: false,
        alternativeMethod: 'web'
      };
    }

    return {
      available: true,
      message: 'In-app purchases available',
      canPurchase: true
    };
  }

  /**
   * Disconnect from service and clean up
   */
  async disconnect(): Promise<void> {
    if (this.isInitialized) {
      try {
        // Remove listener
        Purchases.removeCustomerInfoUpdateListener(this.handleCustomerInfoUpdate);
        
        this.isInitialized = false;
        console.log('🔌 RevenueCat IAP service disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting RevenueCat service:', error);
      }
    }
  }
}

export default RevenueCatIAPService;
