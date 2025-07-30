import { User } from '@/types';
import { WalletService } from '../wallets';
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
    this.messageSigning = new MessageSigning(this.walletService['keyDelegation']);
  }

  /**
   * Connect to wallet and create user
   */
  async connectWallet(): Promise<AuthResult> {
    try {
      if (!this.walletService.isWalletAvailable('phantom')) {
        return {
          success: false,
          error: 'Phantom wallet not installed'
        };
      }

      const address = await this.walletService.connectWallet('phantom');
      
      const user: User = {
        address,
        lastChecked: Date.now(),
      };

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
    await this.walletService.disconnectWallet('phantom');
  }

  /**
   * Verify ordinal ownership for a user
   */
  async verifyOrdinal(user: User): Promise<AuthResult> {
    try {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify ordinal'
      };
    }
  }

  /**
   * Set up key delegation for the user
   */
  async delegateKey(user: User): Promise<AuthResult> {
    try {
      const delegationInfo = await this.walletService.setupKeyDelegation(
        user.address,
        'phantom'
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
  getWalletInfo() {
    return this.walletService.getWalletInfo();
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