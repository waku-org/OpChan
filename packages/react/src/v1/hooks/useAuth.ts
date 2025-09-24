import React from 'react';
import { useClient } from '../context/ClientContext';
import { useOpchanStore, setOpchanState } from '../store/opchanStore';
import {
  User,
  EVerificationStatus,
  DelegationDuration,
  EDisplayPreference,
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
      displayName: input.address,
      displayPreference:  EDisplayPreference.WALLET_ADDRESS,
      verificationStatus: EVerificationStatus.WALLET_CONNECTED,
      lastChecked: Date.now(),
    };

    try {
      await client.database.storeUser(baseUser);
      // Prime identity service so display name/ens are cached
      await client.userIdentityService.getUserIdentity(baseUser.address);

      setOpchanState(prev => ({
        ...prev,
        session: {
          ...prev.session,
          currentUser: baseUser,
          verificationStatus: baseUser.verificationStatus,
          delegation: prev.session.delegation,
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
    const user = currentUser;
    if (!user) return false;
    try {
      const identity = await client.userIdentityService.getUserIdentityFresh(user.address);
      const nextStatus = identity?.verificationStatus ?? EVerificationStatus.WALLET_CONNECTED;

      const updated: User = {
        ...user,
        verificationStatus: nextStatus,
        displayName: identity?.displayPreference === EDisplayPreference.CALL_SIGN ? identity.callSign! : identity!.ensName!,
        ensDetails: identity?.ensName ? { ensName: identity.ensName } : undefined,
        ordinalDetails: identity?.ordinalDetails,
      };

      await client.database.storeUser(updated);
      await client.database.upsertUserIdentity(user.address, {
        ensName: identity?.ensName || undefined,
        ordinalDetails: identity?.ordinalDetails,
        verificationStatus: nextStatus,
        lastUpdated: Date.now(),
      });

      setOpchanState(prev => ({
        ...prev,
        session: { ...prev.session, currentUser: updated, verificationStatus: nextStatus },
      }));
      return nextStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;
    } catch (e) {
      console.error('verifyOwnership failed', e);
      return false;
    }
  }, [client, currentUser]);

  const delegate = React.useCallback(async (
    signFunction: (message: string) => Promise<string>,
    duration: DelegationDuration = '7days',
  ): Promise<boolean> => {
    const user = currentUser;
    if (!user) return false;
    try {
      const ok = await client.delegation.delegate(
        user.address,
        user.walletType,
        duration,
        signFunction,
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

  const clearDelegation = React.useCallback(async () => {
    await client.delegation.clear();
    setOpchanState(prev => ({
      ...prev,
      session: { ...prev.session, delegation: null },
    }));
  }, [client]);

  const updateProfile = React.useCallback(async (updates: { callSign?: string; displayPreference?: EDisplayPreference }): Promise<boolean> => {
    const user = currentUser;
    if (!user) return false;
    try {
      const ok = await client.userIdentityService.updateUserProfile(
        user.address,
        updates.callSign,
        updates.displayPreference ?? user.displayPreference,
      );
      if (!ok) return false;

      await client.userIdentityService.refreshUserIdentity(user.address);
      const fresh = await client.userIdentityService.getUserIdentity(user.address);
      const updated: User = {
        ...user,
        callSign: fresh?.callSign ?? user.callSign,
        displayPreference: fresh?.displayPreference ?? user.displayPreference,
      };
      await client.database.storeUser(updated);
      setOpchanState(prev => ({ ...prev, session: { ...prev.session, currentUser: updated } }));
      return true;
    } catch (e) {
      console.error('updateProfile failed', e);
      return false;
    }
  }, [client, currentUser]);

  return {
    currentUser,
    verificationStatus,
    isAuthenticated: currentUser !== null,
    // Provide a stable, non-null delegation object for UI safety
    delegation: ((): DelegationFullStatus & { expiresAt?: Date } => {
      const base: DelegationFullStatus =
        delegation ?? ({ hasDelegation: false, isValid: false } as const);
      const expiresAt = base?.proof?.expiryTimestamp
        ? new Date(base.proof.expiryTimestamp)
        : undefined;
      return { ...base, expiresAt };
    })(),
    connect,
    disconnect,
    verifyOwnership,
    delegate,
    delegationStatus,
    clearDelegation,
    updateProfile,
  } as const;
}




