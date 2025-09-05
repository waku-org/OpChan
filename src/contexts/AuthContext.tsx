import React, { createContext, useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { OpchanMessage } from '@/types/forum';
import {
  User,
  EVerificationStatus,
  EDisplayPreference,
} from '@/types/identity';
import { WalletManager } from '@/lib/wallet';
import {
  DelegationManager,
  DelegationDuration,
  DelegationFullStatus,
} from '@/lib/delegation';
import { useAppKitAccount, useDisconnect, modal } from '@reown/appkit/react';

export type VerificationStatus =
  | 'unverified'
  | 'verified-none'
  | 'verified-basic'
  | 'verified-owner'
  | 'verifying';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  verificationStatus: VerificationStatus;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  verifyOwnership: () => Promise<boolean>;
  delegateKey: (duration?: DelegationDuration) => Promise<boolean>;
  getDelegationStatus: () => DelegationFullStatus;
  clearDelegation: () => void;
  signMessage: (message: OpchanMessage) => Promise<OpchanMessage | null>;
  verifyMessage: (message: OpchanMessage) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('unverified');
  const { toast } = useToast();

  // Use AppKit hooks for multi-chain support
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });

  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;

  // Get the active account info
  const activeAccount = isBitcoinConnected ? bitcoinAccount : ethereumAccount;
  const address = activeAccount.address;

  // Create manager instances
  const delegationManager = useMemo(() => new DelegationManager(), []);

  // Create wallet manager when we have all dependencies
  useEffect(() => {
    if (modal && (bitcoinAccount.isConnected || ethereumAccount.isConnected)) {
      try {
        WalletManager.create(modal, bitcoinAccount, ethereumAccount);
      } catch (error) {
        console.warn('Failed to create WalletManager:', error);
        WalletManager.clear();
      }
    } else {
      WalletManager.clear();
    }
  }, [bitcoinAccount, ethereumAccount]);

  // Helper functions for user persistence
  const loadStoredUser = (): User | null => {
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
      console.error('Failed to parse stored user data', e);
      localStorage.removeItem('opchan-user');
      return null;
    }
  };

  const saveUser = (user: User): void => {
    localStorage.setItem('opchan-user', JSON.stringify(user));
  };

  // Helper function for ownership verification
  const verifyUserOwnership = async (user: User): Promise<User> => {
    if (user.walletType === 'bitcoin') {
      // TODO: revert when the API is ready
      // const response = await ordinalApi.getOperatorDetails(user.address);
      // const hasOperators = response.has_operators;
      const hasOperators = true;

      return {
        ...user,
        ordinalDetails: hasOperators
          ? { ordinalId: 'mock', ordinalDetails: 'Mock ordinal for testing' }
          : undefined,
        verificationStatus: hasOperators
          ? EVerificationStatus.VERIFIED_OWNER
          : EVerificationStatus.VERIFIED_BASIC,
        lastChecked: Date.now(),
      };
    } else if (user.walletType === 'ethereum') {
      try {
        const walletInfo = WalletManager.hasInstance()
          ? await WalletManager.getInstance().getWalletInfo()
          : null;
        const hasENS = !!walletInfo?.ensName;
        const ensName = walletInfo?.ensName;

        return {
          ...user,
          ensDetails: hasENS && ensName ? { ensName } : undefined,
          verificationStatus: hasENS
            ? EVerificationStatus.VERIFIED_OWNER
            : EVerificationStatus.VERIFIED_BASIC,
          lastChecked: Date.now(),
        };
      } catch (error) {
        console.error('Error verifying ENS ownership:', error);
        return {
          ...user,
          ensDetails: undefined,
          verificationStatus: EVerificationStatus.VERIFIED_BASIC,
          lastChecked: Date.now(),
        };
      }
    } else {
      throw new Error('Unknown wallet type');
    }
  };

  // Helper function for key delegation
  const createUserDelegation = async (
    user: User,
    duration: DelegationDuration = '7days'
  ): Promise<boolean> => {
    try {
      if (!WalletManager.hasInstance()) {
        throw new Error(
          'Wallet not connected. Please ensure your wallet is connected.'
        );
      }

      const walletManager = WalletManager.getInstance();

      // Verify wallet type matches
      if (walletManager.getWalletType() !== user.walletType) {
        throw new Error(
          `Expected ${user.walletType} wallet, but ${walletManager.getWalletType()} is connected.`
        );
      }

      // Use the simplified delegation method
      return await delegationManager.delegate(
        user.address,
        user.walletType,
        duration,
        message => walletManager.signMessage(message)
      );
    } catch (error) {
      console.error(
        `Error creating key delegation for ${user.walletType}:`,
        error
      );
      return false;
    }
  };

  // Sync with AppKit wallet state
  useEffect(() => {
    if (isConnected && address) {
      // Check if we have a stored user for this address
      const storedUser = loadStoredUser();

      if (storedUser && storedUser.address === address) {
        // Use stored user data
        setCurrentUser(storedUser);
        setVerificationStatus(getVerificationStatus(storedUser));
      } else {
        // Create new user from AppKit wallet
        const newUser: User = {
          address,
          walletType: isBitcoinConnected ? 'bitcoin' : 'ethereum',
          verificationStatus: EVerificationStatus.VERIFIED_BASIC, // Connected wallets get basic verification by default
          displayPreference: EDisplayPreference.WALLET_ADDRESS,
          lastChecked: Date.now(),
        };

        // For Ethereum wallets, try to check ENS ownership immediately
        if (isEthereumConnected) {
          try {
            const walletManager = WalletManager.getInstance();
            walletManager
              .getWalletInfo()
              .then(walletInfo => {
                if (walletInfo?.ensName) {
                  const updatedUser = {
                    ...newUser,
                    ensDetails: { ensName: walletInfo.ensName },
                    verificationStatus: EVerificationStatus.VERIFIED_OWNER,
                  };
                  setCurrentUser(updatedUser);
                  setVerificationStatus('verified-owner');
                  saveUser(updatedUser);
                } else {
                  setCurrentUser(newUser);
                  setVerificationStatus('verified-basic');
                  saveUser(newUser);
                }
              })
              .catch(() => {
                // Fallback to basic verification if ENS check fails
                setCurrentUser(newUser);
                setVerificationStatus('verified-basic');
                saveUser(newUser);
              });
          } catch {
            // WalletManager not ready, fallback to basic verification
            setCurrentUser(newUser);
            setVerificationStatus('verified-basic');
            saveUser(newUser);
          }
        } else {
          setCurrentUser(newUser);
          setVerificationStatus('verified-basic');
          saveUser(newUser);
        }

        const chainName = isBitcoinConnected ? 'Bitcoin' : 'Ethereum';
        // Note: We can't use useUserDisplay hook here since this is not a React component
        // This is just for toast messages, so simple truncation is acceptable
        const displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;

        toast({
          title: 'Wallet Connected',
          description: `Connected to ${chainName} with ${displayName}`,
        });

        const verificationType = isBitcoinConnected
          ? 'Ordinal ownership'
          : 'ENS ownership';
        toast({
          title: 'Action Required',
          description: `You can participate in the forum now! Verify your ${verificationType} for premium features and delegate a signing key for better UX.`,
        });
      }
    } else {
      // Wallet disconnected
      setCurrentUser(null);
      setVerificationStatus('unverified');
    }
  }, [isConnected, address, isBitcoinConnected, isEthereumConnected, toast]);

  const { disconnect } = useDisconnect();

  const connectWallet = async (): Promise<boolean> => {
    try {
      if (modal) {
        await modal.open();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  const disconnectWallet = (): void => {
    disconnect();
  };

  const getVerificationStatus = (user: User): VerificationStatus => {
    if (user.walletType === 'bitcoin') {
      return user.ordinalDetails ? 'verified-owner' : 'verified-basic';
    } else if (user.walletType === 'ethereum') {
      return user.ensDetails ? 'verified-owner' : 'verified-basic';
    }
    return 'unverified';
  };

  const verifyOwnership = async (): Promise<boolean> => {
    if (!currentUser || !currentUser.address) {
      toast({
        title: 'Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return false;
    }

    setIsAuthenticating(true);
    setVerificationStatus('verifying');

    try {
      const verificationType =
        currentUser.walletType === 'bitcoin' ? 'Ordinal' : 'ENS';
      toast({
        title: `Verifying ${verificationType}`,
        description: `Checking your wallet for ${verificationType} ownership...`,
      });

      const updatedUser = await verifyUserOwnership(currentUser);
      setCurrentUser(updatedUser);
      saveUser(updatedUser);

      // Update verification status
      setVerificationStatus(getVerificationStatus(updatedUser));

      if (updatedUser.walletType === 'bitcoin' && updatedUser.ordinalDetails) {
        toast({
          title: 'Ordinal Verified',
          description:
            'You now have premium access with higher relevance bonuses. We recommend delegating a key for better UX.',
        });
      } else if (
        updatedUser.walletType === 'ethereum' &&
        updatedUser.ensDetails
      ) {
        toast({
          title: 'ENS Verified',
          description:
            'You now have premium access with higher relevance bonuses. We recommend delegating a key for better UX.',
        });
      } else {
        const verificationType =
          updatedUser.walletType === 'bitcoin'
            ? 'Ordinal Operators'
            : 'ENS domain';
        toast({
          title: 'Basic Access Granted',
          description: `No ${verificationType} found, but you can still participate in the forum with your connected wallet.`,
          variant: 'default',
        });
      }

      return Boolean(
        (updatedUser.walletType === 'bitcoin' && updatedUser.ordinalDetails) ||
          (updatedUser.walletType === 'ethereum' && updatedUser.ensDetails)
      );
    } catch (error) {
      console.error('Error verifying ownership:', error);
      setVerificationStatus('unverified');

      let errorMessage = 'Failed to verify ownership. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Verification Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const delegateKey = async (
    duration: DelegationDuration = '7days'
  ): Promise<boolean> => {
    if (!currentUser) {
      toast({
        title: 'No User Found',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return false;
    }

    setIsAuthenticating(true);

    try {
      const durationText = duration === '7days' ? '1 week' : '30 days';
      toast({
        title: 'Starting Key Delegation',
        description: `This will let you post, comment, and vote without approving each action for ${durationText}.`,
      });

      const success = await createUserDelegation(currentUser, duration);
      if (!success) {
        throw new Error('Failed to create key delegation');
      }

      // Update user with delegation info
      const delegationStatus = delegationManager.getStatus(
        currentUser.address,
        currentUser.walletType
      );

      const updatedUser = {
        ...currentUser,
        browserPubKey: delegationStatus.publicKey || undefined,
        delegationSignature: delegationStatus.isValid ? 'valid' : undefined,
        delegationExpiry: delegationStatus.timeRemaining
          ? Date.now() + delegationStatus.timeRemaining
          : undefined,
      };

      setCurrentUser(updatedUser);
      saveUser(updatedUser);

      // Format date for user-friendly display
      const expiryDate = new Date(updatedUser.delegationExpiry!);
      const formattedExpiry = expiryDate.toLocaleString();

      toast({
        title: 'Key Delegation Successful',
        description: `You can now interact with the forum without additional wallet approvals until ${formattedExpiry}.`,
      });

      return true;
    } catch (error) {
      console.error('Error delegating key:', error);

      let errorMessage = 'Failed to delegate key. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Delegation Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getDelegationStatus = (): DelegationFullStatus => {
    return delegationManager.getStatus(
      currentUser?.address,
      currentUser?.walletType
    );
  };

  const clearDelegation = (): void => {
    delegationManager.clear();

    // Update the current user to remove delegation info
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        delegationExpiry: undefined,
        browserPublicKey: undefined,
      };
      setCurrentUser(updatedUser);
      saveUser(updatedUser);
    }

    toast({
      title: 'Delegation Cleared',
      description:
        "Your delegated signing key has been removed. You'll need to delegate a new key to continue posting and voting.",
    });
  };

  const messageSigning = {
    signMessage: async (
      message: OpchanMessage
    ): Promise<OpchanMessage | null> => {
      return delegationManager.signMessage(message);
    },
    verifyMessage: async (message: OpchanMessage): Promise<boolean> => {
      return await delegationManager.verify(message);
    },
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticating,
    isAuthenticated: Boolean(currentUser && isConnected),
    verificationStatus,
    connectWallet,
    disconnectWallet,
    verifyOwnership,
    delegateKey,
    getDelegationStatus,
    clearDelegation,
    signMessage: messageSigning.signMessage,
    verifyMessage: messageSigning.verifyMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
