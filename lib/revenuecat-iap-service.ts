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
    'betacoins_20',    // 20 BetaCoins for RM5
    'betacoins_100',   // 100 BetaCoins for RM20
    'betacoins_250',   // 250 BetaCoins for RM35
    'betacoins_600',   // 600 BetaCoins for RM80
    'betacoins_1000',  // 1000 BetaCoins for RM100
    'betacoins_2000',  // 2000 BetaCoins for RM180
  ];

  // Product mapping to BetaCoin amounts
  private readonly productMapping: Record<string, number> = {
    'betacoins_20': 20,
    'betacoins_100': 100,
    'betacoins_250': 250,
    'betacoins_600': 600,
    'betacoins_1000': 1000,
    'betacoins_2000': 2000,
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

      // Enable StoreKit testing mode for better compatibility
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      
      console.log('🧪 StoreKit Configuration detected - enabling enhanced logging');

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
   * Load products from RevenueCat and StoreKit
   */
  private async loadProducts(): Promise<void> {
    console.log('🔍 Loading products for StoreKit testing...');
    
    // For StoreKit testing, we'll load products directly from StoreKit
    // This bypasses RevenueCat's offerings system which doesn't work with unapproved products
    const storeKitSuccess = await this.loadFromStoreKit();
    
    if (storeKitSuccess) {
      console.log('✅ Products loaded successfully from StoreKit');
      return;
    }

    // If StoreKit fails, try RevenueCat offerings as fallback
    try {
      console.log('🔄 Trying RevenueCat offerings as fallback...');
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
            price: `RM${this.getFallbackPrice(productId).toFixed(2)}`,
            priceAmount: this.getFallbackPrice(productId),
            currency: 'MYR',
            betacoinAmount,
            package: pkg,
          };
        });
        
        console.log('✅ Products loaded from RevenueCat offerings:', this.products.length);
        return;
      }
    } catch (error) {
      console.log('⚠️ RevenueCat offerings also failed:', error);
    }

    // Final fallback to static products
    console.log('🔄 Using static fallback products for testing...');
    await this.loadStaticProducts();
  }

  /**
   * Get fallback price for a product ID
   */
  private getFallbackPrice(productId: string): number {
    const fallbackPrices: Record<string, number> = {
      'betacoins_20': 4.90,
      'betacoins_100': 19.90,
      'betacoins_250': 34.90,
      'betacoins_600': 79.90,
      'betacoins_1000': 99.90,
      'betacoins_2000': 179.90,
    };
    return fallbackPrices[productId] || 0;
  }

  /**
   * Try to load products directly from StoreKit
   */
  private async loadFromStoreKit(): Promise<boolean> {
    try {
      console.log('🛒 Loading products directly from StoreKit for testing...');
      
      // Get products directly from StoreKit - this should work with StoreKit configuration
      const products = await Purchases.getProducts(this.productIds);
      
      if (products && products.length > 0) {
        console.log(`🎉 Found ${products.length} products from StoreKit configuration!`);
        
        this.products = products.map((product) => {
          const betacoinAmount = this.productMapping[product.identifier] || 0;
          console.log(`📦 StoreKit Product: ${product.identifier} - ${product.title} - ${product.priceString}`);
          
          return {
            productId: product.identifier,
            title: product.title || `${betacoinAmount} BetaCoins`,
            description: product.description || `Purchase ${betacoinAmount} BetaCoins`,
            price: product.priceString || `RM${this.getFallbackPrice(product.identifier).toFixed(2)}`,
            priceAmount: product.price || this.getFallbackPrice(product.identifier),
            currency: product.currencyCode || 'MYR',
            betacoinAmount,
            storeProduct: product,
            package: undefined, // No RevenueCat package for direct StoreKit
          };
        });
        
        console.log('✅ Products loaded from StoreKit configuration:', this.products.length);
        console.log('📋 Available products:', this.products.map(p => `${p.productId}: ${p.betacoinAmount} BetaCoins - ${p.price}`));
        return true;
      } else {
        console.log('⚠️ No products returned from StoreKit');
        console.log('   This means the StoreKit configuration file is not properly loaded');
        console.log('   Check that BetaCoins.storekit is linked in Xcode project');
      }
    } catch (error) {
      console.log('❌ Error loading from StoreKit:', error);
      console.log('   Make sure StoreKit configuration is properly set up in Xcode');
    }
    
    return false;
  }

  /**
   * Load static products for testing when StoreKit is not available
   */
  private async loadStaticProducts(): Promise<void> {
    console.log('🔄 Loading static products for testing...');
    this.products = [
      {
        productId: 'betacoins_20',
        title: '20 BetaCoins',
        description: 'Purchase 20 BetaCoins for RM4.90',
        price: 'RM4.90',
        priceAmount: 4.90,
        currency: 'MYR',
        betacoinAmount: 20,
      },
      {
        productId: 'betacoins_100',
        title: '100 BetaCoins',
        description: 'Purchase 100 BetaCoins for RM19.90',
        price: 'RM19.90',
        priceAmount: 19.90,
        currency: 'MYR',
        betacoinAmount: 100,
      },
      {
        productId: 'betacoins_250',
        title: '250 BetaCoins',
        description: 'Purchase 250 BetaCoins for RM34.90',
        price: 'RM34.90',
        priceAmount: 34.90,
        currency: 'MYR',
        betacoinAmount: 250,
      },
      {
        productId: 'betacoins_600',
        title: '600 BetaCoins',
        description: 'Purchase 600 BetaCoins for RM79.90',
        price: 'RM79.90',
        priceAmount: 79.90,
        currency: 'MYR',
        betacoinAmount: 600,
      },
      {
        productId: 'betacoins_1000',
        title: '1000 BetaCoins',
        description: 'Purchase 1000 BetaCoins for RM99.90',
        price: 'RM99.90',
        priceAmount: 99.90,
        currency: 'MYR',
        betacoinAmount: 1000,
      },
      {
        productId: 'betacoins_2000',
        title: '2000 BetaCoins',
        description: 'Purchase 2000 BetaCoins for RM179.90',
        price: 'RM179.90',
        priceAmount: 179.90,
        currency: 'MYR',
        betacoinAmount: 2000,
      },
    ];
    
    console.log('✅ Static products loaded for testing:', this.products.length);
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
   * Purchase a product directly from StoreKit (when no package available)
   */
  private async purchaseDirectFromStoreKit(productId: string, userId: string): Promise<IAPPurchaseResult> {
    try {
      console.log(`🛒 Purchasing ${productId} directly from StoreKit...`);
      
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
        console.log('✅ StoreKit purchase successful:', productId);
        
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
      console.error('❌ StoreKit purchase failed:', error);
      
      // Handle different error types
      let errorMessage = 'Purchase failed';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('Couldn\'t find product')) {
          errorMessage = 'Product not available in StoreKit configuration';
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

      // For StoreKit testing, always use direct purchase
      console.log(`🛒 Initiating StoreKit purchase for ${productId}...`);
      return await this.purchaseDirectFromStoreKit(productId, userId);
      
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
