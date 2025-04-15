
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types/forum';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  verifyOrdinal: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();
  
  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('opchan-user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Check if the stored authentication is still valid (not expired)
        const lastChecked = user.lastChecked || 0;
        const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (Date.now() - lastChecked < expiryTime) {
          setCurrentUser(user);
        } else {
          // Clear expired session
          localStorage.removeItem('opchan-user');
        }
      } catch (e) {
        console.error("Failed to parse stored user data", e);
        localStorage.removeItem('opchan-user');
      }
    }
  }, []);

  // Mock wallet connection for development
  const connectWallet = async () => {
    setIsAuthenticating(true);
    try {
      // In a real app, this would connect to a Bitcoin wallet
      // For now, we'll simulate a wallet connection with a mock address
      const mockAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      
      // Create a new user object
      const newUser: User = {
        address: mockAddress,
        lastChecked: Date.now(),
      };
      
      // Store user data
      setCurrentUser(newUser);
      localStorage.setItem('opchan-user', JSON.stringify(newUser));
      
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
    toast({
      title: "Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  // Mock Ordinal verification
  const verifyOrdinal = async () => {
    if (!currentUser) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return false;
    }
    
    setIsAuthenticating(true);
    try {
      // In a real app, this would verify Ordinal ownership
      // For demo purposes, we'll simulate a successful verification
      const updatedUser = {
        ...currentUser,
        ordinalOwnership: true,
        signature: "mockSignature123",
        lastChecked: Date.now(),
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem('opchan-user', JSON.stringify(updatedUser));
      
      toast({
        title: "Ordinal Verified",
        description: "You can now post and interact with the forum.",
      });
      
      return true;
    } catch (error) {
      console.error("Error verifying Ordinal:", error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify Ordinal ownership. Please try again.",
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
