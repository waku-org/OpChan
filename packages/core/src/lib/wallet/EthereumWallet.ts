import { 
  type WalletClient, 
  type PublicClient,
  verifyMessage
} from 'viem';
import { getEnsName, getEnsAvatar, normalize } from 'viem/ens';

/**
 * Simplified Ethereum wallet management
 * Direct viem integration without multi-chain complexity
 */
export class EthereumWallet {
  constructor(
    private walletClient: WalletClient,
    private publicClient: PublicClient
  ) {}

  /**
   * Get the current wallet address
   */
  async getAddress(): Promise<`0x${string}`> {
    const [address] = await this.walletClient.getAddresses();
    if (!address) {
      throw new Error('No address found in wallet');
    }
    return address;
  }

  /**
   * Sign a message with the wallet
   */
  async signMessage(message: string): Promise<string> {
    const address = await this.getAddress();
    return this.walletClient.signMessage({
      account: address,
      message,
    });
  }

  /**
   * Verify a signature against an address
   */
  async verifySignature(
    message: string,
    signature: `0x${string}`,
    address: `0x${string}`
  ): Promise<boolean> {
    try {
      return await verifyMessage({
        address,
        message,
        signature,
      });
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Resolve ENS name and avatar for an address
   */
  async resolveENS(address: `0x${string}`): Promise<{
    name: string | null;
    avatar: string | null;
  }> {
    try {
      const name = await getEnsName(this.publicClient, { 
        address 
      });

      if (!name) {
        return { name: null, avatar: null };
      }

      const avatar = await getEnsAvatar(this.publicClient, { 
        name: normalize(name) 
      });

      return { name, avatar };
    } catch (error) {
      console.error('Failed to resolve ENS:', error);
      return { name: null, avatar: null };
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!this.walletClient && !!this.publicClient;
  }
}

// Static helper methods for when you don't have a wallet instance
export class EthereumWalletHelpers {
  /**
   * Resolve ENS name for an address using a public client
   */
  static async resolveENS(
    publicClient: PublicClient,
    address: `0x${string}`
  ): Promise<{ name: string | null; avatar: string | null }> {
    try {
      const name = await getEnsName(publicClient, { address });

      if (!name) {
        return { name: null, avatar: null };
      }

      const avatar = await getEnsAvatar(publicClient, { 
        name: normalize(name) 
      });

      return { name, avatar };
    } catch (error) {
      console.error('Failed to resolve ENS:', error);
      return { name: null, avatar: null };
    }
  }

  /**
   * Verify a signature (static version)
   */
  static async verifySignature(
    message: string,
    signature: `0x${string}`,
    address: `0x${string}`
  ): Promise<boolean> {
    try {
      return await verifyMessage({
        address,
        message,
        signature,
      });
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }
}

