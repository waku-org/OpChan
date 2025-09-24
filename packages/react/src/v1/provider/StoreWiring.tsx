import React from 'react';
import { useClient } from '../context/ClientContext';
import { setOpchanState, getOpchanState } from '../store/opchanStore';
import type { OpchanMessage, User } from '@opchan/core';
import { EVerificationStatus, EDisplayPreference } from '@opchan/core';

export const StoreWiring: React.FC = () => {
  const client = useClient();

  // Initial hydrate from LocalDatabase
  React.useEffect(() => {
    let unsubHealth: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;
    let unsubIdentity: (() => void) | null = null;

    const hydrate = async () => {
      try {
        await client.database.open();
        const cache = client.database.cache;
        
        // Reflect content cache
        setOpchanState(prev => ({
          ...prev,
          content: {
            ...prev.content,
              cells: Object.values(cache.cells),
              posts: Object.values(cache.posts),
              comments: Object.values(cache.comments),
            bookmarks: Object.values(cache.bookmarks),
            lastSync: client.database.getSyncState().lastSync,
            pendingIds: new Set<string>(),
            pendingVotes: new Set<string>(),
          },
        }));

        // Hydrate session (user + delegation) from LocalDatabase
        try {
          const loadedUser = await client.database.loadUser();
          const delegationStatus = await client.delegation.getStatus(
            loadedUser?.address,
            loadedUser?.walletType,
          );

          // If we have a loaded user, enrich it with latest identity for display fields
          let enrichedUser: User | null = loadedUser ?? null;
          if (loadedUser) {
            try {
              const identity = await client.userIdentityService.getUserIdentity(loadedUser.address);
              if (identity) {
                const displayName = identity.displayPreference === EDisplayPreference.CALL_SIGN
                  ? (identity.callSign || loadedUser.displayName)
                  : (identity.ensName || loadedUser.displayName);
                enrichedUser = {
                  ...loadedUser,
                  callSign: identity.callSign ?? loadedUser.callSign,
                  displayPreference: identity.displayPreference ?? loadedUser.displayPreference,
                  displayName,
                  ensDetails: identity.ensName ? { ensName: identity.ensName } : loadedUser.ensDetails,
                  ordinalDetails: identity.ordinalDetails ?? loadedUser.ordinalDetails,
                  verificationStatus: identity.verificationStatus ?? loadedUser.verificationStatus,
                };
                try { await client.database.storeUser(enrichedUser); } catch { /* ignore persist error */ }
              }
            } catch { /* ignore identity enrich error */ }
          }

          setOpchanState(prev => ({
            ...prev,
            session: {
              currentUser: enrichedUser,
              verificationStatus:
                enrichedUser?.verificationStatus ?? EVerificationStatus.WALLET_UNCONNECTED,
              delegation: delegationStatus ?? null,
            },
          }));
        } catch (sessionErr) {
          console.error('Initial session hydrate failed', sessionErr);
        }
      } catch (e) {
        console.error('Initial hydrate failed', e);
      }
    };

    const wire = () => {
      unsubHealth = client.messageManager.onHealthChange((isReady: boolean) => {
        setOpchanState(prev => ({
          ...prev,
          network: {
            ...prev.network,
            isConnected: isReady,
            statusMessage: isReady ? 'connected' : 'connecting…',
            issues: isReady ? [] : prev.network.issues,
          },
        }));
      });

      unsubMessages = client.messageManager.onMessageReceived(async (message: OpchanMessage) => {
        // Persist, then reflect cache in store
        try {
          await client.database.updateCache(message);
          const cache = client.database.cache;
          setOpchanState(prev => ({
            ...prev,
            content: {
              ...prev.content,
              cells: Object.values(cache.cells),
              posts: Object.values(cache.posts),
              comments: Object.values(cache.comments),
              bookmarks: Object.values(cache.bookmarks),
              lastSync: Date.now(),
              pendingIds: prev.content.pendingIds,
              pendingVotes: prev.content.pendingVotes,
            },
          }));
        } catch (e) {
          console.error('Failed to apply incoming message', e);
        }
      });

      // Reactively update session.currentUser when identity refreshes for the active user
      unsubIdentity = client.userIdentityService.addRefreshListener(async (address: string) => {
        try {
          const { session } = getOpchanState();
          const active = session.currentUser;
          if (!active || active.address !== address) return;

          const identity = await client.userIdentityService.getUserIdentity(address);
          if (!identity) return;

          const displayName = identity.displayPreference === EDisplayPreference.CALL_SIGN
            ? (identity.callSign || active.displayName)
            : (identity.ensName || active.displayName);

          const updated: User = {
            ...active,
            callSign: identity.callSign ?? active.callSign,
            displayPreference: identity.displayPreference ?? active.displayPreference,
            displayName,
            ensDetails: identity.ensName ? { ensName: identity.ensName } : active.ensDetails,
            ordinalDetails: identity.ordinalDetails ?? active.ordinalDetails,
            verificationStatus: identity.verificationStatus ?? active.verificationStatus,
          };

          try { await client.database.storeUser(updated); } catch { /* ignore persist error */ }

          setOpchanState(prev => ({
            ...prev,
            session: {
              ...prev.session,
              currentUser: updated,
              verificationStatus: updated.verificationStatus,
            },
          }));
        } catch (err) {
          console.warn('Identity refresh wiring failed', err);
        }
      });
    };

    hydrate().then(wire);

    return () => {
      unsubHealth?.();
      unsubMessages?.();
      unsubIdentity?.();
    };
  }, [client]);

  return null;
};


