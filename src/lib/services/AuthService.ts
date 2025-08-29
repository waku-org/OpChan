import { WalletService } from '../identity/wallets/index';
import { UseAppKitAccountReturn } from '@reown/appkit/react';
import { AppKit } from '@reown/appkit';
import { OrdinalAPI } from '../identity/ordinal';
import { CryptoService, DelegationDuration } from './CryptoService';
import { EVerificationStatus, User } from '@/types/forum';
import { WalletInfo } from '../identity/wallets/ReOwnWalletService';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthServiceInterface {
  // Wallet operations
  setAccounts(bitcoinAccount: UseAppKitAccountReturn, ethereumAccount: UseAppKitAccountReturn): void;
  setAppKit(appKit: AppKit): void;
  connectWallet(): Promise<AuthResult>;
  disconnectWallet(): Promise<void>;
  
  // Verification
  verifyOwnership(user: User): Promise<AuthResult>;
  
  // Delegation setup
  delegateKey(user: User, duration?: DelegationDuration): Promise<AuthResult>;
  
  // User persistence
  loadStoredUser(): User | null;
  saveUser(user: User): void;
  clearStoredUser(): void;
  
  // Wallet info
  getWalletInfo(): Promise<WalletInfo | null>;
}

export class AuthService implements AuthServiceInterface {
  private walletService: WalletService;
  private ordinalApi: OrdinalAPI;
  private cryptoService: CryptoService;

  constructor(cryptoService: CryptoService) {
    this.walletService = new WalletService();
    this.ordinalApi = new OrdinalAPI();
    this.cryptoService = cryptoService;
  }

  /**
   * Set AppKit accounts for wallet service
   */
  setAccounts(bitcoinAccount: UseAppKitAccountReturn, ethereumAccount: UseAppKitAccountReturn) {
    this.walletService.setAccounts(bitcoinAccount, ethereumAccount);
  }

  /**
   * Set AppKit instance for wallet service
   */
  setAppKit(appKit: AppKit) {
    this.walletService.setAppKit(appKit);
  }

  /**
   * Get the active wallet address
   */
  private getActiveAddress(): string | null {
    const isBitcoinConnected = this.walletService.isWalletAvailable('bitcoin');
    const isEthereumConnected = this.walletService.isWalletAvailable('ethereum');
    
    if (isBitcoinConnected) {
      return this.walletService.getActiveAddress('bitcoin') || null;
    } else if (isEthereumConnected) {
      return this.walletService.getActiveAddress('ethereum') || null;
    }
    
    return null;
  }

  /**
   * Get the active wallet type
   */
  private getActiveWalletType(): 'bitcoin' | 'ethereum' | null {
    if (this.walletService.isWalletAvailable('bitcoin')) {
      return 'bitcoin';
    } else if (this.walletService.isWalletAvailable('ethereum')) {
      return 'ethereum';
    }
    return null;
  }

  /**
   * Connect to wallet and create user
   */
  async connectWallet(): Promise<AuthResult> {
    try {
      // Check which wallet is connected
      const isBitcoinConnected = this.walletService.isWalletAvailable('bitcoin');
      const isEthereumConnected = this.walletService.isWalletAvailable('ethereum');
      
      if (!isBitcoinConnected && !isEthereumConnected) {
        return {
          success: false,
          error: 'No wallet connected'
        };
      }

      // Determine which wallet is active
      const walletType = isBitcoinConnected ? 'bitcoin' : 'ethereum';
      const address = this.getActiveAddress();

      if (!address) {
        return {
          success: false,
          error: 'No wallet address available'
        };
      }

      const user: User = {
        address: address,
        walletType: walletType,
        verificationStatus: EVerificationStatus.UNVERIFIED,
        lastChecked: Date.now(),
      };

      // Add ENS info for Ethereum wallets (if available)
      if (walletType === 'ethereum') {
        try {
          const walletInfo = await this.walletService.getWalletInfo();
          user.ensName = walletInfo?.ensName;
          user.ensOwnership = !!(walletInfo?.ensName);
        } catch (error) {
          console.warn('Failed to resolve ENS during wallet connection:', error);
          user.ensName = undefined;
          user.ensOwnership = false;
        }
      }

      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      };
    }
  }

  /**
   * Disconnect wallet and clear stored data
   */
  async disconnectWallet(): Promise<void> {
    // Clear any existing delegations when disconnecting
    this.cryptoService.clearDelegation();
    
    // Clear stored user data
    this.clearStoredUser();
  }

  /**
   * Verify ordinal ownership for Bitcoin users or ENS ownership for Ethereum users
   */
  async verifyOwnership(user: User): Promise<AuthResult> {
    try {
      if (user.walletType === 'bitcoin') {
        return await this.verifyBitcoinOrdinal(user);
      } else if (user.walletType === 'ethereum') {
        return await this.verifyEthereumENS(user);
      } else {
        return {
          success: false,
          error: 'Unknown wallet type'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify ownership'
      };
    }
  }

  /**
   * Verify Bitcoin Ordinal ownership
   */
  private async verifyBitcoinOrdinal(user: User): Promise<AuthResult> {
    // TODO: revert when the API is ready
    // const response = await this.ordinalApi.getOperatorDetails(user.address);
    // const hasOperators = response.has_operators;
    const hasOperators = true;

    const updatedUser = {
      ...user,
      ordinalOwnership: hasOperators,
      verificationStatus: hasOperators ? EVerificationStatus.VERIFIED_OWNER : EVerificationStatus.VERIFIED_BASIC,
      lastChecked: Date.now(),
    };

    return {
      success: true,
      user: updatedUser
    };
  }

  /**
   * Verify Ethereum ENS ownership
   */
  private async verifyEthereumENS(user: User): Promise<AuthResult> {
    try {
      // Get wallet info with ENS resolution
      const walletInfo = await this.walletService.getWalletInfo();
      
      const hasENS = !!(walletInfo?.ensName);
      const ensName = walletInfo?.ensName;

      const updatedUser = {
        ...user,
        ensOwnership: hasENS,
        ensName: ensName,
        verificationStatus: hasENS ? EVerificationStatus.VERIFIED_OWNER : EVerificationStatus.VERIFIED_BASIC,
        lastChecked: Date.now(),
      };

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      
      // Fall back to basic verification on error
      const updatedUser = {
        ...user,
        ensOwnership: false,
        ensName: undefined,
        verificationStatus: EVerificationStatus.VERIFIED_BASIC,
        lastChecked: Date.now(),
      };

      return {
        success: true,
        user: updatedUser
      };
    }
  }

  /**
   * Set up key delegation for the user
   */
  async delegateKey(user: User, duration: DelegationDuration = '7days'): Promise<AuthResult> {
    try {
      const walletType = user.walletType;
      const isAvailable = this.walletService.isWalletAvailable(walletType);
      
      if (!isAvailable) {
        return {
          success: false,
          error: `${walletType} wallet is not available or connected. Please ensure it is connected.`
        };
      }

      const success = await this.walletService.createKeyDelegation(walletType, duration);
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to create key delegation'
        };
      }

      // Get delegation status to update user
      const delegationStatus = this.walletService.getDelegationStatus(walletType);
      
      // Get the actual browser public key from the delegation
      const browserPublicKey = this.cryptoService.getBrowserPublicKey();
      
      const updatedUser = {
        ...user,
        browserPubKey: browserPublicKey || undefined,
        delegationSignature: delegationStatus.isValid ? 'valid' : undefined,
        delegationExpiry: delegationStatus.timeRemaining ? Date.now() + delegationStatus.timeRemaining : undefined,
      };

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delegate key'
      };
    }
  }

  /**
   * Get current wallet info
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    // Use the wallet service to get detailed wallet info including ENS
    return await this.walletService.getWalletInfo();
  }

  /**
   * Load user from localStorage
   */
  loadStoredUser(): User | null {
    const storedUser = localStorage.getItem('opchan-user');
    if (!storedUser) return null;

    try {
      const user = JSON.parse(storedUser);
      const lastChecked = user.lastChecked || 0;
      const expiryTime = 24 * 60 * 60 * 1000;
      
      if (Date.now() - lastChecked < expiryTime) {
        return user;
      } else {
        localStorage.removeItem('opchan-user');
        return null;
      }
    } catch (e) {
      console.error("Failed to parse stored user data", e);
      localStorage.removeItem('opchan-user');
      return null;
    }
  }

  /**
   * Save user to localStorage
   */
  saveUser(user: User): void {
    localStorage.setItem('opchan-user', JSON.stringify(user));
  }

  /**
   * Clear stored user data
   */
  clearStoredUser(): void {
    localStorage.removeItem('opchan-user');
  }
} 