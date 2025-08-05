import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { AuthService, AuthResult } from '@/lib/identity/services/AuthService';
import { OpchanMessage } from '@/types';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';

export type VerificationStatus = 'unverified' | 'verified-none' | 'verified-owner' | 'verifying';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  verificationStatus: VerificationStatus;
  verifyOwnership: () => Promise<boolean>;
  delegateKey: () => Promise<boolean>;
  isDelegationValid: () => boolean;
  delegationTimeRemaining: () => number;
  isWalletAvailable: () => boolean;
  messageSigning: {
    signMessage: (message: OpchanMessage) => Promise<OpchanMessage | null>;
    verifyMessage: (message: OpchanMessage) => boolean;
  };
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
  
  // Create ref for AuthService so it persists between renders
  const authServiceRef = useRef(new AuthService());
  
  // Set AppKit accounts in AuthService
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
          verificationStatus: 'unverified',
          lastChecked: Date.now(),
        };

        setCurrentUser(newUser);
        setVerificationStatus('unverified');
        authServiceRef.current.saveUser(newUser);
        
        const chainName = isBitcoinConnected ? 'Bitcoin' : 'Ethereum';
        const displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${chainName} with ${displayName}`,
        });
        
        const verificationType = isBitcoinConnected ? 'Ordinal ownership' : 'ENS ownership';
        toast({
          title: "Action Required",
          description: `Please verify your ${verificationType} and delegate a signing key for better UX.`,
        });
      }
    } else {
      // Wallet disconnected
      setCurrentUser(null);
      setVerificationStatus('unverified');
    }
  }, [isConnected, address, isBitcoinConnected, isEthereumConnected, toast]);

  const getVerificationStatus = (user: User): VerificationStatus => {
    if (user.walletType === 'bitcoin') {
      return user.ordinalOwnership ? 'verified-owner' : 'verified-none';
    } else if (user.walletType === 'ethereum') {
      return user.ensOwnership ? 'verified-owner' : 'verified-none';
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
          description: "You now have full access. We recommend delegating a key for better UX.",
        });
      } else if (updatedUser.walletType === 'ethereum' && updatedUser.ensOwnership) {
        toast({
          title: "ENS Verified",
          description: "You now have full access. We recommend delegating a key for better UX.",
        });
      } else {
        const verificationType = updatedUser.walletType === 'bitcoin' ? 'Ordinal Operators' : 'ENS domain';
        toast({
          title: "Read-Only Access",
          description: `No ${verificationType} found. You have read-only access.`,
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

  const delegateKey = async (): Promise<boolean> => {
    if (!currentUser || !currentUser.address) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return false;
    }
    
    setIsAuthenticating(true);
    
    try {
      toast({
        title: "Starting Key Delegation",
        description: "This will let you post, comment, and vote without approving each action for 24 hours.",
      });
      
      const result: AuthResult = await authServiceRef.current.delegateKey(currentUser);
      
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
    return authServiceRef.current.isDelegationValid();
  };

  const delegationTimeRemaining = (): number => {
    return authServiceRef.current.getDelegationTimeRemaining();
  };

  const isWalletAvailable = (): boolean => {
    return isConnected;
  };

  const messageSigning = {
    signMessage: async (message: OpchanMessage): Promise<OpchanMessage | null> => {
      return authServiceRef.current.signMessage(message);
    },
    verifyMessage: (message: OpchanMessage): boolean => {
      return authServiceRef.current.verifyMessage(message);
    }
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: Boolean(currentUser && isConnected),
    isAuthenticating,
    verificationStatus,
    verifyOwnership,
    delegateKey,
    isDelegationValid,
    delegationTimeRemaining,
    isWalletAvailable,
    messageSigning
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


