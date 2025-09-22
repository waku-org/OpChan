import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { OpChanClient, type EVerificationStatus } from '@opchan/core';

export interface IdentityRecord {
  address: string;
  displayName: string;
  callSign: string | null;
  ensName: string | null;
  ordinalDetails: string | null;
  verificationStatus: EVerificationStatus;
  lastUpdated: number;
}

export interface IdentityContextValue {
  getIdentity: (address: string) => IdentityRecord | null;
  getDisplayName: (address: string) => string;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export const IdentityProvider: React.FC<{ client: OpChanClient; children: React.ReactNode }> = ({ client, children }) => {
  const [cache, setCache] = useState<Record<string, IdentityRecord>>({});

  useEffect(() => {
    let mounted = true;
    const seedFromService = async () => {
      try {
        // Warm snapshot of any already-cached identities
        const identities = client.userIdentityService.getAllUserIdentities();
        if (!mounted) return;
        const next: Record<string, IdentityRecord> = {};
        identities.forEach(id => {
          next[id.address] = {
            address: id.address,
            displayName: client.userIdentityService.getDisplayName(id.address),
            callSign: id.callSign ?? null,
            ensName: id.ensName ?? null,
            ordinalDetails: id.ordinalDetails?.ordinalDetails ?? null,
            verificationStatus: id.verificationStatus,
            lastUpdated: id.lastUpdated,
          };
        });
        setCache(next);
      } catch {}
    };
    seedFromService();

    // Subscribe to identity refresh events for live updates
    const off = client.userIdentityService.addRefreshListener(async (address: string) => {
      try {
        const fresh = await client.userIdentityService.getUserIdentity(address);
        if (!fresh) return;
        setCache(prev => ({
          ...prev,
          [address]: {
            address,
            displayName: client.userIdentityService.getDisplayName(address),
            callSign: fresh.callSign ?? null,
            ensName: fresh.ensName ?? null,
            ordinalDetails: fresh.ordinalDetails?.ordinalDetails ?? null,
            verificationStatus: fresh.verificationStatus,
            lastUpdated: fresh.lastUpdated,
          },
        }));
      } catch {}
    });

    return () => {
      try { off && off(); } catch {}
      mounted = false;
    };
  }, [client]);

  const getIdentity = useMemo(() => {
    return (address: string): IdentityRecord | null => cache[address] ?? null;
  }, [cache]);

  const getDisplayName = useMemo(() => {
    return (address: string): string => client.userIdentityService.getDisplayName(address);
  }, [client]);

  const value: IdentityContextValue = useMemo(() => ({ getIdentity, getDisplayName }), [getIdentity, getDisplayName]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
};

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used within OpChanProvider');
  return ctx;
}

export { IdentityContext };


