import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, EVerificationStatus, OpChanClient, EDisplayPreference } from '@opchan/core';
import { walletManager, delegationManager, messageManager, LocalDatabase, localDatabase, WalletManager } from '@opchan/core';
import { DelegationDuration } from '@opchan/core';
import { useAppKitAccount } from '@reown/appkit/react';

export interface AuthContextValue {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  verificationStatus: EVerificationStatus;

  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  verifyOwnership: () => Promise<boolean>;

  delegateKey: (duration?: DelegationDuration) => Promise<boolean>;
  getDelegationStatus: () => ReturnType<typeof delegationManager.getStatus>;
  clearDelegation: () => Promise<void>;

  signMessage: typeof messageManager.sendMessage;
  verifyMessage: (message: unknown) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ 
  client: OpChanClient; 
  children: React.ReactNode 
}> = ({ client, children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Get wallet connection status from AppKit
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });

  const isWalletConnected = bitcoinAccount.isConnected || ethereumAccount.isConnected;
  const connectedAddress = bitcoinAccount.address || ethereumAccount.address;
  const walletType = bitcoinAccount.isConnected ? 'bitcoin' : 'ethereum';

  // ✅ Removed console.log to prevent infinite loop spam

  // Define verifyOwnership function early so it can be used in useEffect dependencies
  const verifyOwnership = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    try {
      // Centralize identity resolution in core service
      const identity = await client.userIdentityService.getUserIdentityFresh(currentUser.address);

      const newVerificationStatus = identity?.verificationStatus ?? EVerificationStatus.WALLET_CONNECTED;

      const updatedUser = {
        ...currentUser,
        verificationStatus: newVerificationStatus,
        ensDetails: identity?.ensName ? { ensName: identity.ensName } : undefined,
        ordinalDetails: identity?.ordinalDetails,
      } as User;

      setCurrentUser(updatedUser);
      await localDatabase.storeUser(updatedUser);

      await localDatabase.upsertUserIdentity(currentUser.address, {
        ensName: identity?.ensName || undefined,
        ordinalDetails: identity?.ordinalDetails,
        verificationStatus: newVerificationStatus,
        lastUpdated: Date.now(),
      });

      return newVerificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;
    } catch (error) {
      console.error('❌ Verification failed:', error);
      const updatedUser = { ...currentUser, verificationStatus: EVerificationStatus.WALLET_CONNECTED } as User;
      setCurrentUser(updatedUser);
      await localDatabase.storeUser(updatedUser);
      return false;
    }
  }, [client.userIdentityService, currentUser]);

  // Hydrate user from LocalDatabase on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await localDatabase.loadUser();
        if (mounted && user) {
          setCurrentUser(user);
          
          // 🔄 Sync verification status with UserIdentityService
          await localDatabase.upsertUserIdentity(user.address, {
            ensName: user.ensDetails?.ensName,
            ordinalDetails: user.ordinalDetails,
            verificationStatus: user.verificationStatus,
            lastUpdated: Date.now(),
          });
          
          // 🔄 Check if verification status needs updating on load
          // If user has ENS details but verification status is outdated, auto-verify
          if (user.ensDetails?.ensName && user.verificationStatus !== EVerificationStatus.ENS_ORDINAL_VERIFIED) {
            try {
              await verifyOwnership();
            } catch (error) {
              console.error('❌ Auto-verification on load failed:', error);
            }
          }
        }
      } catch (e) {
        console.error('❌ Failed to load user from database:', e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []); // Remove verifyOwnership dependency to prevent infinite loops

  // Auto-connect when wallet is detected
  useEffect(() => {
    const autoConnect = async () => {
      if (isWalletConnected && connectedAddress && !currentUser) {
        setIsAuthenticating(true);
        try {
          // Check if we have stored user data for this address
          const storedUser = await localDatabase.loadUser();
          
          const user: User = storedUser && storedUser.address === connectedAddress ? {
            // Preserve existing user data including verification status
            ...storedUser,
            walletType: walletType as 'bitcoin' | 'ethereum',
            lastChecked: Date.now(),
          } : {
            // Create new user with basic connection status
            address: connectedAddress,
            walletType: walletType as 'bitcoin' | 'ethereum',
            displayPreference: EDisplayPreference.WALLET_ADDRESS,
            verificationStatus: EVerificationStatus.WALLET_CONNECTED,
            lastChecked: Date.now(),
          };
          
          setCurrentUser(user);
          await localDatabase.storeUser(user);
          
          // Also store identity info so UserIdentityService can access it
          await localDatabase.upsertUserIdentity(connectedAddress, {
            verificationStatus: user.verificationStatus,
            lastUpdated: Date.now(),
          });
          
          // 🔥 AUTOMATIC VERIFICATION: Check if user needs verification
          // Only auto-verify if they don't already have ENS_ORDINAL_VERIFIED status
          if (user.verificationStatus !== EVerificationStatus.ENS_ORDINAL_VERIFIED) {
            try {
              await verifyOwnership();
            } catch (error) {
              console.error('❌ Auto-verification failed:', error);
              // Don't fail the connection if verification fails
            }
          }
        } catch (error) {
          console.error('❌ Auto-connect failed:', error);
        } finally {
          setIsAuthenticating(false);
        }
      } else if (!isWalletConnected && currentUser) {
        setCurrentUser(null);
        await localDatabase.clearUser();
      }
    };

    autoConnect();
  }, [isWalletConnected, connectedAddress, walletType]); // Remove currentUser and verifyOwnership dependencies

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (!isWalletConnected || !connectedAddress) return false;
    
    try {
      setIsAuthenticating(true);
      
      const user: User = {
        address: connectedAddress,
        walletType: walletType as 'bitcoin' | 'ethereum',
        displayPreference: currentUser?.displayPreference ?? EDisplayPreference.WALLET_ADDRESS,
        verificationStatus: EVerificationStatus.WALLET_CONNECTED,
        lastChecked: Date.now(),
      };
      setCurrentUser(user);
      await localDatabase.storeUser(user);
      return true;
    } catch (e) {
      console.error('connectWallet failed', e);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [currentUser?.displayPreference, isWalletConnected, connectedAddress, walletType]);

  const disconnectWallet = useCallback(() => {
    setCurrentUser(null);
    localDatabase.clearUser().catch(console.error);
  }, []);

  const delegateKey = useCallback(async (duration?: DelegationDuration): Promise<boolean> => {
    if (!currentUser) return false;
    
    console.log('🔑 Starting delegation process...', { currentUser, duration });
    
    try {
      const ok = await delegationManager.delegate(
        currentUser.address,
        currentUser.walletType,
        duration ?? '7days',
        async (msg: string) => {
          console.log('🖋️ Signing delegation message...', msg);
          
          if (currentUser.walletType === 'ethereum') {
            // For Ethereum wallets, we need to import and use signMessage dynamically
            // This avoids the context issue by importing at runtime
            const { signMessage } = await import('wagmi/actions');
            const { config } = await import('@opchan/core');
            return await signMessage(config, { message: msg });
          } else {
            // For Bitcoin wallets, we need to use AppKit's Bitcoin adapter
            // For now, throw an error as Bitcoin signing needs special handling
            throw new Error('Bitcoin delegation signing not implemented yet. Please use Ethereum wallet.');
          }
        }
      );
      
      console.log('📝 Delegation result:', ok);
      return ok;
    } catch (e) {
      console.error('❌ delegateKey failed:', e);
      return false;
    }
  }, [currentUser]);

  const getDelegationStatus = useCallback(async () => {
    return delegationManager.getStatus(currentUser?.address, currentUser?.walletType);
  }, [currentUser?.address, currentUser?.walletType]);

  const clearDelegation = useCallback(async () => {
    await delegationManager.clear();
  }, []);

  const verifyMessage = useCallback(async (message: unknown) => {
    try {
      return delegationManager.verify(message as never);
    } catch {
      return false;
    }
  }, []);

  const ctx: AuthContextValue = useMemo(() => {
    return {
      currentUser,
      isAuthenticated: !!currentUser,
      isAuthenticating,
      verificationStatus: currentUser?.verificationStatus ?? EVerificationStatus.WALLET_UNCONNECTED,
      connectWallet,
      disconnectWallet,
      verifyOwnership,
      delegateKey,
      getDelegationStatus,
      clearDelegation,
      signMessage: messageManager.sendMessage.bind(messageManager),
      verifyMessage,
    };
  }, [currentUser, isAuthenticating, connectWallet, disconnectWallet, verifyOwnership, delegateKey, getDelegationStatus, clearDelegation, verifyMessage]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within OpChanProvider');
  return ctx;
}

export { AuthContext };


