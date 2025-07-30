import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { OrdinalAPI } from '@/lib/identity/ordinal';
import { KeyDelegation } from '@/lib/identity/signatures/key-delegation';
import { PhantomWalletAdapter } from '@/lib/identity/wallets/phantom';
import { MessageSigning } from '@/lib/identity/signatures/message-signing';
import { WalletConnectionStatus } from '@/lib/identity/wallets/types';

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
  messageSigning: MessageSigning;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const { toast } = useToast();
  const ordinalApi = new OrdinalAPI();
  
  // Create refs for our services so they persist between renders
  const phantomWalletRef = useRef(new PhantomWalletAdapter());
  const keyDelegationRef = useRef(new KeyDelegation());
  const messageSigningRef = useRef(new MessageSigning(keyDelegationRef.current));
  
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
          restoreWalletConnection(user).catch(error => {
            console.warn('Background wallet reconnection failed:', error);
          });
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

  /**
   * Attempts to restore the wallet connection when user data is loaded from localStorage
   */
  const restoreWalletConnection = async (user?: User) => {
    try {
      const userToCheck = user || currentUser;
      if (!phantomWalletRef.current.isInstalled() || !userToCheck?.address) {
        return;
      }
      
      const address = await phantomWalletRef.current.connect();
      
      if (address === userToCheck.address) {
        console.log('Wallet connection restored successfully');
      } else {
        console.warn('Stored address does not match connected address, clearing stored data');
        localStorage.removeItem('opchan-user');
        setCurrentUser(null);
        setVerificationStatus('unverified');
      }
    } catch (error) {
      console.warn('Failed to restore wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    setIsAuthenticating(true);
    try {
      // Check if Phantom wallet is installed
      if (!phantomWalletRef.current.isInstalled()) {
        toast({
          title: "Wallet Not Found",
          description: "Please install Phantom wallet to continue.",
          variant: "destructive",
        });
        throw new Error("Phantom wallet not installed");
      }
      
      const address = await phantomWalletRef.current.connect();
      
      const newUser: User = {
        address,
        lastChecked: Date.now(),
      };
      
      setCurrentUser(newUser);
      localStorage.setItem('opchan-user', JSON.stringify(newUser));
      setVerificationStatus('unverified');
      
      toast({
        title: "Wallet Connected",
        description: `Connected with address ${address.slice(0, 6)}...${address.slice(-4)}`,
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
    phantomWalletRef.current.disconnect();
    
    setCurrentUser(null);
    localStorage.removeItem('opchan-user');
    keyDelegationRef.current.clearDelegation();
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
      
      //TODO: revert when the API is ready
      // const response = await ordinalApi.getOperatorDetails(currentUser.address);
      // const hasOperators = response.has_operators;
      const hasOperators = true;

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
          description: "You now have full access. We recommend delegating a key for better UX.",
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

  /**
   * Creates a key delegation by generating a browser keypair, having the
   * wallet sign a delegation message, and storing the delegation
   */
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
      const walletStatus = phantomWalletRef.current.getStatus();
      console.log('Current wallet status:', walletStatus);
      
      if (walletStatus !== WalletConnectionStatus.Connected) {
        console.log('Wallet not connected, attempting to reconnect...');
        try {
          await phantomWalletRef.current.connect();
          console.log('Wallet reconnection successful');
        } catch (reconnectError) {
          console.error('Failed to reconnect wallet:', reconnectError);
          toast({
            title: "Wallet Connection Required",
            description: "Please reconnect your wallet to delegate a key.",
            variant: "destructive",
          });
          return false;
        }
      }
      
      toast({
        title: "Starting Key Delegation",
        description: "This will let you post, comment, and vote without approving each action for 24 hours.",
      });
      
      // Generate a browser keypair
      const keypair = await keyDelegationRef.current.generateKeypair();
      
      // Calculate expiry time (24 hours from now)
      const expiryHours = 24;
      const expiryTimestamp = Date.now() + (expiryHours * 60 * 60 * 1000);
      
      // Create delegation message
      const delegationMessage = keyDelegationRef.current.createDelegationMessage(
        keypair.publicKey,
        currentUser.address,
        expiryTimestamp
      );
      
      // Format date for user-friendly display
      const expiryDate = new Date(expiryTimestamp);
      const formattedExpiry = expiryDate.toLocaleString();
      
      toast({
        title: "Wallet Signature Required",
        description: `Please sign with your wallet to authorize a temporary key valid until ${formattedExpiry}. This improves UX by reducing wallet prompts.`,
      });
      
      const signature = await phantomWalletRef.current.signMessage(delegationMessage);
      
      const delegationInfo = keyDelegationRef.current.createDelegation(
        currentUser.address,
        signature,
        keypair.publicKey,
        keypair.privateKey,
        expiryHours
      );
      
      keyDelegationRef.current.storeDelegation(delegationInfo);
      
      const updatedUser = {
        ...currentUser,
        browserPubKey: keypair.publicKey,
        delegationSignature: signature,
        delegationExpiry: expiryTimestamp,
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem('opchan-user', JSON.stringify(updatedUser));
      
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
  
  /**
   * Checks if the current delegation is valid
   */
  const isDelegationValid = (): boolean => {
    return keyDelegationRef.current.isDelegationValid();
  };
  
  /**
   * Returns the time remaining on the current delegation in milliseconds
   */
  const delegationTimeRemaining = (): number => {
    return keyDelegationRef.current.getDelegationTimeRemaining();
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
        messageSigning: messageSigningRef.current,
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
