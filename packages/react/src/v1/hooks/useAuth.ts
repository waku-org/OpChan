import React from 'react';
import { useClient } from '../context/ClientContext';
import { useOpchanStore, setOpchanState } from '../store/opchanStore';
import {
  User,
  EVerificationStatus,
  DelegationDuration,
  EDisplayPreference,
  walletManager,
} from '@opchan/core';
import type { DelegationFullStatus } from '@opchan/core';

export interface ConnectInput {
  address: string;
  walletType: 'bitcoin' | 'ethereum';
}

export function useAuth() {
  const client = useClient();
  const currentUser = useOpchanStore(s => s.session.currentUser);
  const verificationStatus = useOpchanStore(s => s.session.verificationStatus);
  const delegation = useOpchanStore(s => s.session.delegation);


  const connect = React.useCallback(async (input: ConnectInput): Promise<boolean> => {
    const baseUser: User = {
      address: input.address,
      walletType: input.walletType,
      displayName: input.address.slice(0, 6) + '...' + input.address.slice(-4),
      displayPreference:  EDisplayPreference.WALLET_ADDRESS,
      verificationStatus: EVerificationStatus.WALLET_CONNECTED,
      lastChecked: Date.now(),
    };

    try {
      await client.database.storeUser(baseUser);
      // Prime identity service so display name/ens are cached
      const identity = await client.userIdentityService.getIdentity(baseUser.address);
      if (!identity) return false;
      setOpchanState(prev => ({
        ...prev,
        session: {
          ...prev.session,
          currentUser: {
            ...baseUser,
            ...identity,
          },
        },
      }));
      return true;
    } catch (e) {
      console.error('connect failed', e);
      return false;
    }
  }, [client]);

  const disconnect = React.useCallback(async (): Promise<void> => {
    try {
      await client.database.clearUser();
    } finally {
      setOpchanState(prev => ({
        ...prev,
        session: {
          currentUser: null,
          verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
          delegation: null,
        },
      }));
    }
  }, [client]);

  const verifyOwnership = React.useCallback(async (): Promise<boolean> => {
    console.log('verifyOwnership')
    const user = currentUser;
    if (!user) return false;
    try {
      const identity = await client.userIdentityService.getIdentity(user.address, { fresh: true });
      if (!identity) {
        console.error('verifyOwnership failed', 'identity not found');
        return false;
      }

      console.log({user, identity})

      const updated: User = {
        ...user,
        ...identity,  
      };

      await client.database.storeUser(updated);
      await client.database.upsertUserIdentity(user.address, {
        displayName: identity.displayName,
        ensName: identity?.ensName || undefined,
        ordinalDetails: identity?.ordinalDetails,
        verificationStatus: identity.verificationStatus,  
        lastUpdated: Date.now(),
      });

      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, currentUser: updated, verificationStatus: identity.verificationStatus },
      }));
      return identity.verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;
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
    try {
      const signer = ((message: string) => walletManager.getInstance().signMessage(message));
      const ok = await client.delegation.delegate(
        user.address,
        user.walletType,
        duration,
        signer,
      );

      const status = await client.delegation.getStatus(user.address, user.walletType);
      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, delegation: status },
      }));
      return ok;
    } catch (e) {
      console.error('delegate failed', e);
      return false;
    }
  }, [client, currentUser]);

  const delegationStatus = React.useCallback(async () => {
    const user = currentUser;
    if (!user) return { hasDelegation: false, isValid: false } as const;
    return client.delegation.getStatus(user.address, user.walletType);
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
    updateProfile,
  } as const;
}




