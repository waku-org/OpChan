import React from 'react';
import { useClient } from '../context/ClientContext';
import { useEthereumWallet } from './useEthereumWallet';
import { useOpchanStore, setOpchanState } from '../store/opchanStore';
import {
  User,
  EVerificationStatus,
  DelegationDuration,
  EDisplayPreference,
} from '@opchan/core';
import type { DelegationFullStatus } from '@opchan/core';

export function useAuth() {
  const client = useClient();
  const wallet = useEthereumWallet();
  const currentUser = useOpchanStore(s => s.session.currentUser);
  const verificationStatus = useOpchanStore(s => s.session.verificationStatus);
  const delegation = useOpchanStore(s => s.session.delegation);

  // Sync Ethereum wallet state to OpChan session
  React.useEffect(() => {
    const syncWallet = async () => {
      if (wallet.isConnected && wallet.address) {
        // Wallet connected - create/update user session
        const baseUser: User = {
          address: wallet.address,
          displayName: wallet.address.slice(0, 6) + '...' + wallet.address.slice(-4),
          displayPreference: EDisplayPreference.WALLET_ADDRESS,
          verificationStatus: EVerificationStatus.WALLET_CONNECTED,
          lastChecked: Date.now(),
        };

        try {
          // Set public client for ENS resolution
          if (wallet.publicClient) {
            client.userIdentityService.setPublicClient(wallet.publicClient);
          }

          await client.database.storeUser(baseUser);
          // Prime identity service so display name/ens are cached
          const identity = await client.userIdentityService.getIdentity(baseUser.address);
          if (identity) {
            setOpchanState(prev => ({
              ...prev,
              session: {
                ...prev.session,
                currentUser: {
                  ...baseUser,
                  ...identity,
                },
                verificationStatus: identity.verificationStatus,
              },
            }));
          } else {
            setOpchanState(prev => ({
              ...prev,
              session: {
                ...prev.session,
                currentUser: baseUser,
                verificationStatus: baseUser.verificationStatus,
              },
            }));
          }
        } catch (e) {
          console.error('Failed to sync wallet to session', e);
        }
      } else if (!wallet.isConnected && currentUser && currentUser.verificationStatus !== EVerificationStatus.ANONYMOUS) {
        // Wallet disconnected - clear session (but preserve anonymous users)
        try {
          await client.database.clearUser();
        } catch (e) {
          console.error('Failed to clear user on disconnect', e);
        }
        setOpchanState(prev => ({
          ...prev,
          session: {
            currentUser: null,
            verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
            delegation: null,
          },
        }));
      }
    };

    syncWallet();
  }, [wallet.isConnected, wallet.address, wallet.publicClient, client, currentUser]);

  const connect = React.useCallback((): void => {
    wallet.connect();
  }, [wallet]);

  const disconnect = React.useCallback(async (): Promise<void> => {
    await wallet.disconnect();
  }, [wallet]);

  const verifyOwnership = React.useCallback(async (): Promise<boolean> => {
    console.log('verifyOwnership');
    const user = currentUser;
    if (!user) return false;
    try {
      const identity = await client.userIdentityService.getIdentity(user.address, { fresh: true });
      if (!identity) {
        console.error('verifyOwnership failed', 'identity not found');
        return false;
      }

      const updated: User = {
        ...user,
        ...identity,
      };

      await client.database.storeUser(updated);
      await client.database.upsertUserIdentity(user.address, {
        displayName: identity.displayName,
        ensName: identity?.ensName || undefined,
        ensAvatar: identity?.ensAvatar || undefined,
        verificationStatus: identity.verificationStatus,
        lastUpdated: Date.now(),
      });

      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, currentUser: updated, verificationStatus: identity.verificationStatus },
      }));
      return identity.verificationStatus === EVerificationStatus.ENS_VERIFIED;
    } catch (e) {
      console.error('verifyOwnership failed', e);
      return false;
    }
  }, [client, currentUser]);

  const delegate = React.useCallback(async (
    duration: DelegationDuration = '7days',
  ): Promise<boolean> => {
    const user = currentUser;
    if (!user) return false;
    // Only wallet users (not anonymous) can delegate with wallet signature
    if (user.verificationStatus === EVerificationStatus.ANONYMOUS) {
      console.warn('Anonymous users cannot create wallet delegations');
      return false;
    }
    try {
      const ok = await client.delegation.delegate(
        user.address as `0x${string}`,
        duration,
        wallet.signMessage,
      );

      const status = await client.delegation.getStatus(user.address);
      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, delegation: status },
      }));
      return ok;
    } catch (e) {
      console.error('delegate failed', e);
      return false;
    }
  }, [client, currentUser, wallet]);

  const delegationStatus = React.useCallback(async () => {
    const user = currentUser;
    if (!user) return { hasDelegation: false, isValid: false } as const;
    return client.delegation.getStatus(user.address);
  }, [client, currentUser]);

  const clearDelegation = React.useCallback(async (): Promise<boolean> => {
    try {
      await client.delegation.clear();
      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, delegation: null },
      }));
      return true;
    } catch (e) {
      console.error('clearDelegation failed', e);
      return false;
    }
  }, [client]);

  const startAnonymous = React.useCallback(async (): Promise<string | null> => {
    try {
      const sessionId = await client.delegation.delegateAnonymous('7days');
      
      const anonymousUser: User = {
        address: sessionId,
        displayName: `Anonymous-${sessionId.slice(0, 8)}`,
        displayPreference: EDisplayPreference.WALLET_ADDRESS,
        verificationStatus: EVerificationStatus.ANONYMOUS,
        lastChecked: Date.now(),
      };
      
      await client.database.storeUser(anonymousUser);
      setOpchanState(prev => ({
        ...prev,
        session: {
          ...prev.session,
          currentUser: anonymousUser,
          verificationStatus: EVerificationStatus.ANONYMOUS,
        },
      }));
      
      return sessionId;
    } catch (e) {
      console.error('startAnonymous failed', e);
      return null;
    }
  }, [client]);

  const updateProfile = React.useCallback(async (updates: { callSign?: string; displayPreference?: EDisplayPreference }): Promise<boolean> => {
    const user = currentUser;
    if (!user) return false;
    try {
      const res = await client.userIdentityService.updateProfile(
        user.address,
        {
          callSign: updates.callSign,
          displayPreference: updates.displayPreference ?? user.displayPreference,
        }
      );
      if (!res.ok) return false;

      const identity = res.identity;
      const updated: User = {
        ...user,
        ...identity,
        // Preserve verification status for anonymous users (getIdentity might not return it)
        verificationStatus: user.verificationStatus,
      };
      await client.database.storeUser(updated);
      setOpchanState(prev => ({ ...prev, session: { ...prev.session, currentUser: updated } }));
      return true;
    } catch (e) {
      console.error('updateProfile failed', e);
      return false;
    }
  }, [client, currentUser]);

  const delegationInfo = React.useMemo<DelegationFullStatus & { expiresAt?: Date }>(() => {
    const base: DelegationFullStatus =
      delegation ?? ({ hasDelegation: false, isValid: false } as const);
    const expiresAt = base?.proof?.expiryTimestamp
      ? new Date(base.proof.expiryTimestamp)
      : undefined;
    return { ...base, expiresAt };
  }, [delegation]);

  return {
    currentUser,
    verificationStatus,
    isAuthenticated: currentUser !== null,
    delegationInfo,
    connect,
    disconnect,
    verifyOwnership,
    delegate,
    delegationStatus,
    clearDelegation,
    startAnonymous,
    updateProfile,
  } as const;
}
