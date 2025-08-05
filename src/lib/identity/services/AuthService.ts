import { User } from '@/types';
import { WalletService, AppKitAccount } from '../wallets/index';
import { OrdinalAPI } from '../ordinal';
import { MessageSigning } from '../signatures/message-signing';
import { OpchanMessage } from '@/types';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  private walletService: WalletService;
  private ordinalApi: OrdinalAPI;
  private messageSigning: MessageSigning;

  constructor() {
    this.walletService = new WalletService();
    this.ordinalApi = new OrdinalAPI();
    this.messageSigning = new MessageSigning(this.walletService.getKeyDelegation());
  }

  /**
   * Set AppKit accounts for wallet service
   */
  setAccounts(bitcoinAccount: AppKitAccount, ethereumAccount: AppKitAccount) {
    this.walletService.setAccounts(bitcoinAccount, ethereumAccount);
  }

  /**
   * Connect to wallet and create user
   */
  async connectWallet(): Promise<AuthResult> {
    try {
      const walletInfo = await this.walletService.getWalletInfo();
      if (!walletInfo) {
        return {
          success: false,
          error: 'No wallet connected'
        };
      }

      const user: User = {
        address: walletInfo.address,
        walletType: walletInfo.walletType,
        verificationStatus: 'unverified',
        lastChecked: Date.now(),
      };

      // Add ENS info for Ethereum wallets
      if (walletInfo.walletType === 'ethereum' && walletInfo.ensName) {
        user.ensName = walletInfo.ensName;
        user.ensOwnership = true;
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
   * Disconnect wallet and clear user data
   */
  async disconnectWallet(): Promise<void> {
    const walletType = this.walletService.getActiveWalletType();
    if (walletType) {
      await this.walletService.disconnectWallet(walletType);
    }
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
    const walletInfo = await this.walletService.getWalletInfo();
    const hasENS = walletInfo?.ensName && walletInfo.ensName.length > 0;

    const updatedUser = {
      ...user,
      ensOwnership: hasENS,
      ensName: walletInfo?.ensName,
      lastChecked: Date.now(),
    };

    return {
      success: true,
      user: updatedUser
    };
  }

  /**
   * Set up key delegation for the user
   */
  async delegateKey(user: User): Promise<AuthResult> {
    try {
      const walletType = user.walletType;
      const canConnect = await this.walletService.canConnectWallet(walletType);
      if (!canConnect) {
        return {
          success: false,
          error: `${walletType} wallet is not available or cannot be connected. Please ensure it is installed and unlocked.`
        };
      }

      const delegationInfo = await this.walletService.setupKeyDelegation(
        user.address,
        walletType
      );

      const updatedUser = {
        ...user,
        browserPubKey: delegationInfo.browserPublicKey,
        delegationSignature: delegationInfo.signature,
        delegationExpiry: delegationInfo.expiryTimestamp,
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
   * Sign a message using delegated key
   */
  async signMessage(message: OpchanMessage): Promise<OpchanMessage | null> {
    return this.messageSigning.signMessage(message);
  }

  /**
   * Verify a message signature
   */
  verifyMessage(message: OpchanMessage): boolean {
    return this.messageSigning.verifyMessage(message);
  }

  /**
   * Check if delegation is valid
   */
  isDelegationValid(): boolean {
    return this.walletService.isDelegationValid();
  }

  /**
   * Get delegation time remaining
   */
  getDelegationTimeRemaining(): number {
    return this.walletService.getDelegationTimeRemaining();
  }

  /**
   * Get current wallet info
   */
  async getWalletInfo() {
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