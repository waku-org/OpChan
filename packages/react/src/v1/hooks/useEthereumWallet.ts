import { useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  usePublicClient,
  useWalletClient,
  type Connector,
} from 'wagmi';

export interface EthereumWalletState {
  address: `0x${string}` | null;
  isConnected: boolean;
  isInitialized: boolean; // Always true if wagmi is initialized
}

export interface EthereumWalletControls {
  connect: (connectorId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  connectors: readonly Connector[];
  publicClient: ReturnType<typeof usePublicClient>;
  walletClient: ReturnType<typeof useWalletClient>['data'];
}

export type EthereumWalletValue = EthereumWalletState & EthereumWalletControls;

export function useEthereumWallet(): EthereumWalletValue {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const connect = useCallback(async (connectorId?: string) => {
    const connector = connectorId
      ? connectors.find(c => c.id === connectorId)
      : connectors[0]; // Default to first connector if none specified

    if (!connector) {
      throw new Error('No connector found');
    }

    await connectAsync({ connector });
  }, [connectAsync, connectors]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const signMessage = useCallback(async (message: string) => {
    if (!address) {
      throw new Error('No wallet connected to sign message');
    }
    return signMessageAsync({ message });
  }, [address, signMessageAsync]);

  return {
    address: address ?? null,
    isConnected,
    isInitialized: true, // Wagmi is always "initialized" if hooks are available
    connect,
    disconnect,
    signMessage,
    connectors,
    publicClient,
    walletClient,
  };
}
