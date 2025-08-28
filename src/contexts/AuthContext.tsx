import React, { createContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User, OpchanMessage, EVerificationStatus } from '@/types/forum';
import { AuthService, CryptoService, DelegationDuration } from '@/lib/services';
import { AuthResult } from '@/lib/services/AuthService';
import { useAppKitAccount, useDisconnect, modal } from '@reown/appkit/react';

export type VerificationStatus = 'unverified' | 'verified-none' | 'verified-basic' | 'verified-owner' | 'verifying';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  verificationStatus: VerificationStatus;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  verifyOwnership: () => Promise<boolean>;
  delegateKey: (duration?: DelegationDuration) => Promise<boolean>;
  isDelegationValid: () => boolean;
  delegationTimeRemaining: () => number;
  clearDelegation: () => void;
  signMessage: (message: OpchanMessage) => Promise<OpchanMessage | null>;
  verifyMessage: (message: OpchanMessage) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const { toast } = useToast();
  
  // Use AppKit hooks for multi-chain support
  const bitcoinAccount = useAppKitAccount({ namespace: "bip122" });
  const ethereumAccount = useAppKitAccount({ namespace: "eip155" });
  
  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;
  
  // Get the active account info
  const activeAccount = isBitcoinConnected ? bitcoinAccount : ethereumAccount;
  const address = activeAccount.address;
  
  // Create service instances that persist between renders
  const cryptoServiceRef = useRef(new CryptoService());
  const authServiceRef = useRef(new AuthService(cryptoServiceRef.current));
  
  // Set AppKit instance and accounts in AuthService
  useEffect(() => {
    if (modal) {
      authServiceRef.current.setAppKit(modal);
    }
  }, []);
  
  useEffect(() => {
    authServiceRef.current.setAccounts(bitcoinAccount, ethereumAccount);
  }, [bitcoinAccount, ethereumAccount]);
  
  // Sync with AppKit wallet state
  useEffect(() => {
    if (isConnected && address) {
      // Check if we have a stored user for this address
      const storedUser = authServiceRef.current.loadStoredUser();
      
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
          lastChecked: Date.now(),
        };

        // For Ethereum wallets, try to check ENS ownership immediately
        if (isEthereumConnected) {
          authServiceRef.current.getWalletInfo().then((walletInfo) => {
            if (walletInfo?.ensName) {
              const updatedUser = {
                ...newUser,
                ensOwnership: true,
                ensName: walletInfo.ensName,
                verificationStatus: EVerificationStatus.VERIFIED_OWNER,
              };
              setCurrentUser(updatedUser);
              setVerificationStatus('verified-owner');
              authServiceRef.current.saveUser(updatedUser);
            } else {
              setCurrentUser(newUser);
              setVerificationStatus('verified-basic');
              authServiceRef.current.saveUser(newUser);
            }
          }).catch(() => {
            // Fallback to basic verification if ENS check fails
            setCurrentUser(newUser);
            setVerificationStatus('verified-basic');
            authServiceRef.current.saveUser(newUser);
          });
        } else {
          setCurrentUser(newUser);
          setVerificationStatus('verified-basic');
          authServiceRef.current.saveUser(newUser);
        }
        
        const chainName = isBitcoinConnected ? 'Bitcoin' : 'Ethereum';
        const displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${chainName} with ${displayName}`,
        });
        
        const verificationType = isBitcoinConnected ? 'Ordinal ownership' : 'ENS ownership';
        toast({
          title: "Action Required",
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
      return user.ordinalOwnership ? 'verified-owner' : 'verified-basic';
    } else if (user.walletType === 'ethereum') {
      return user.ensOwnership ? 'verified-owner' : 'verified-basic';
    }
    return 'unverified';
  };

  const verifyOwnership = async (): Promise<boolean> => {
    if (!currentUser || !currentUser.address) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return false;
    }
    
    setIsAuthenticating(true);
    setVerificationStatus('verifying');
    
    try {
      const verificationType = currentUser.walletType === 'bitcoin' ? 'Ordinal' : 'ENS';
      toast({ 
        title: `Verifying ${verificationType}`, 
        description: `Checking your wallet for ${verificationType} ownership...` 
      });
      
      const result: AuthResult = await authServiceRef.current.verifyOwnership(currentUser);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const updatedUser = result.user!;
      setCurrentUser(updatedUser);
      authServiceRef.current.saveUser(updatedUser);
      
      // Update verification status
      setVerificationStatus(getVerificationStatus(updatedUser));
      
      if (updatedUser.walletType === 'bitcoin' && updatedUser.ordinalOwnership) {
        toast({
          title: "Ordinal Verified",
          description: "You now have premium access with higher relevance bonuses. We recommend delegating a key for better UX.",
        });
      } else if (updatedUser.walletType === 'ethereum' && updatedUser.ensOwnership) {
        toast({
          title: "ENS Verified",
          description: "You now have premium access with higher relevance bonuses. We recommend delegating a key for better UX.",
        });
      } else {
        const verificationType = updatedUser.walletType === 'bitcoin' ? 'Ordinal Operators' : 'ENS domain';
        toast({
          title: "Basic Access Granted",
          description: `No ${verificationType} found, but you can still participate in the forum with your connected wallet.`,
          variant: "default",
        });
      }
      
      return Boolean(
        (updatedUser.walletType === 'bitcoin' && updatedUser.ordinalOwnership) ||
        (updatedUser.walletType === 'ethereum' && updatedUser.ensOwnership)
      );
    } catch (error) {
      console.error("Error verifying ownership:", error);
      setVerificationStatus('unverified');
      
      let errorMessage = "Failed to verify ownership. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const delegateKey = async (duration: DelegationDuration = '7days'): Promise<boolean> => {
    if (!currentUser) {
      toast({
        title: "No User Found",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return false;
    }
    
    setIsAuthenticating(true);
    
    try {
      const durationText = duration === '7days' ? '1 week' : '30 days';
      toast({
        title: "Starting Key Delegation",
        description: `This will let you post, comment, and vote without approving each action for ${durationText}.`,
      });
      
      const result: AuthResult = await authServiceRef.current.delegateKey(currentUser, duration);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const updatedUser = result.user!;
      setCurrentUser(updatedUser);
      authServiceRef.current.saveUser(updatedUser);
      
      // Format date for user-friendly display
      const expiryDate = new Date(updatedUser.delegationExpiry!);
      const formattedExpiry = expiryDate.toLocaleString();
      
      toast({
        title: "Key Delegation Successful",
        description: `You can now interact with the forum without additional wallet approvals until ${formattedExpiry}.`,
      });
      
      return true;
    } catch (error) {
      console.error("Error delegating key:", error);
      
      let errorMessage = "Failed to delegate key. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Delegation Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const isDelegationValid = (): boolean => {
    return cryptoServiceRef.current.isDelegationValid();
  };

  const delegationTimeRemaining = (): number => {
    return cryptoServiceRef.current.getDelegationTimeRemaining();
  };

  const clearDelegation = (): void => {
    cryptoServiceRef.current.clearDelegation();
    
    // Update the current user to remove delegation info
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        delegationExpiry: undefined,
        browserPublicKey: undefined
      };
      setCurrentUser(updatedUser);
      authServiceRef.current.saveUser(updatedUser);
    }
    
    toast({
      title: "Delegation Cleared",
      description: "Your delegated signing key has been removed. You'll need to delegate a new key to continue posting and voting.",
    });
  };

  const messageSigning = {
    signMessage: async (message: OpchanMessage): Promise<OpchanMessage | null> => {
      return cryptoServiceRef.current.signMessage(message);
    },
    verifyMessage: (message: OpchanMessage): boolean => {
      return cryptoServiceRef.current.verifyMessage(message);
    }
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
    isDelegationValid,
    delegationTimeRemaining,
    clearDelegation,
    signMessage: messageSigning.signMessage,
    verifyMessage: messageSigning.verifyMessage
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


