import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { AuthService, AuthResult } from '@/lib/identity/services/AuthService';
import { OpchanMessage } from '@/types';

export type VerificationStatus = 'unverified' | 'verified-none' | 'verified-owner' | 'verifying';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  verificationStatus: VerificationStatus;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  verifyOrdinal: () => Promise<boolean>;
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
  
  // Create ref for AuthService so it persists between renders
  const authServiceRef = useRef(new AuthService());
  
  useEffect(() => {
    const storedUser = authServiceRef.current.loadStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      
      if ('ordinalOwnership' in storedUser) {
        setVerificationStatus(storedUser.ordinalOwnership ? 'verified-owner' : 'verified-none');
      } else {
        setVerificationStatus('unverified');
      }
    }
  }, []);

  const connectWallet = async () => {
    setIsAuthenticating(true);
    try {
      const result: AuthResult = await authServiceRef.current.connectWallet();
      
      if (!result.success) {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to wallet. Please try again.",
          variant: "destructive",
        });
        throw new Error(result.error);
      }
      
      const newUser = result.user!;
      setCurrentUser(newUser);
      authServiceRef.current.saveUser(newUser);
      setVerificationStatus('unverified');
      
      toast({
        title: "Wallet Connected",
        description: `Connected with address ${newUser.address.slice(0, 6)}...${newUser.address.slice(-4)}`,
      });
      
      toast({
        title: "Action Required",
        description: "Please verify your Ordinal ownership and delegate a signing key for better UX.",
      });
      
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to wallet. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const disconnectWallet = () => {
    authServiceRef.current.disconnectWallet();
    authServiceRef.current.clearStoredUser();
    
    setCurrentUser(null);
    setVerificationStatus('unverified');
    
    toast({
      title: "Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const verifyOrdinal = async (): Promise<boolean> => {
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
      toast({ 
        title: "Verifying Ordinal", 
        description: "Checking your wallet for Ordinal Operators..." 
      });
      
      const result: AuthResult = await authServiceRef.current.verifyOrdinal(currentUser);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const updatedUser = result.user!;
      setCurrentUser(updatedUser);
      authServiceRef.current.saveUser(updatedUser);
      
      // Update verification status
      setVerificationStatus(updatedUser.ordinalOwnership ? 'verified-owner' : 'verified-none');
      
      if (updatedUser.ordinalOwnership) {
        toast({
          title: "Ordinal Verified",
          description: "You now have full access. We recommend delegating a key for better UX.",
        });
      } else {
        toast({
          title: "Read-Only Access",
          description: "No Ordinal Operators found. You have read-only access.",
          variant: "default",
        });
      }
      
      return Boolean(updatedUser.ordinalOwnership);
    } catch (error) {
      console.error("Error verifying Ordinal:", error);
      setVerificationStatus('unverified');
      
      let errorMessage = "Failed to verify Ordinal ownership. Please try again.";
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
        // Provide specific guidance based on error type
        if (error.message.includes("rejected") || error.message.includes("declined") || error.message.includes("denied")) {
          errorMessage = "You declined the signature request. Key delegation is optional but improves your experience.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Wallet request timed out. Please try again and approve the signature promptly.";
        } else if (error.message.includes("Failed to connect wallet")) {
          errorMessage = "Unable to connect to Phantom wallet. Please ensure it's installed and unlocked, then try again.";
        } else if (error.message.includes("Wallet is not connected")) {
          errorMessage = "Wallet connection was lost. Please reconnect your wallet and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Delegation Failed",
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
    return authServiceRef.current.getWalletInfo()?.type === 'phantom';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser?.ordinalOwnership,
        isAuthenticating,
        verificationStatus,
        connectWallet,
        disconnectWallet,
        verifyOrdinal,
        delegateKey,
        isDelegationValid,
        delegationTimeRemaining,
        isWalletAvailable,
        messageSigning: {
          signMessage: (message: OpchanMessage) => authServiceRef.current.signMessage(message),
          verifyMessage: (message: OpchanMessage) => authServiceRef.current.verifyMessage(message),
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


