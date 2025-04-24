import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { OrdinalAPI } from '@/lib/identity/ordinal';

export type VerificationStatus = 'unverified' | 'verified-none' | 'verified-owner' | 'verifying';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  verificationStatus: VerificationStatus;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  verifyOrdinal: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const { toast } = useToast();
  const ordinalApi = new OrdinalAPI();
  
  useEffect(() => {
    const storedUser = localStorage.getItem('opchan-user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const lastChecked = user.lastChecked || 0;
        const expiryTime = 24 * 60 * 60 * 1000; 
        
        if (Date.now() - lastChecked < expiryTime) {
          setCurrentUser(user);
          
          if ('ordinalOwnership' in user) {
            setVerificationStatus(user.ordinalOwnership ? 'verified-owner' : 'verified-none');
          } else {
            setVerificationStatus('unverified');
          }
        } else {
          localStorage.removeItem('opchan-user');
          setVerificationStatus('unverified');
        }
      } catch (e) {
        console.error("Failed to parse stored user data", e);
        localStorage.removeItem('opchan-user');
        setVerificationStatus('unverified');
      }
    }
  }, []);

  // Mock wallet connection for development
  const connectWallet = async () => {
    setIsAuthenticating(true);
    try {
      //TODO: replace with actual wallet connection
      const mockAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      
      // Create a new user object
      const newUser: User = {
        address: mockAddress,
        lastChecked: Date.now(),
      };
      
      // Store user data
      setCurrentUser(newUser);
      localStorage.setItem('opchan-user', JSON.stringify(newUser));
      setVerificationStatus('unverified');
      
      toast({
        title: "Wallet Connected",
        description: `Connected with address ${mockAddress.slice(0, 6)}...${mockAddress.slice(-4)}`,
      });
      
      // Don't return the address anymore to match the Promise<void> return type
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
    setCurrentUser(null);
    localStorage.removeItem('opchan-user');
    setVerificationStatus('unverified');
    toast({
      title: "Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const verifyOrdinal = async () => {
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
      
      const response = await ordinalApi.getOperatorDetails(currentUser.address);
      const hasOperators = response.has_operators;

      const updatedUser = {
        ...currentUser,
        ordinalOwnership: hasOperators,
        lastChecked: Date.now(),
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem('opchan-user', JSON.stringify(updatedUser));
      
      // Update verification status
      setVerificationStatus(hasOperators ? 'verified-owner' : 'verified-none');
      
      if (hasOperators) {
        toast({
          title: "Ordinal Verified",
          description: "You now have full access to post and interact with the forum.",
        });
      } else {
        toast({
          title: "Read-Only Access",
          description: "No Ordinal Operators found. You have read-only access.",
          variant: "default",
        });
      }
      
      return hasOperators;
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
