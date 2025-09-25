import React from 'react';
import { useClient } from '../context/ClientContext';
import { setOpchanState, getOpchanState } from '../store/opchanStore';
import type { OpchanMessage, User } from '@opchan/core';
import { EVerificationStatus } from '@opchan/core';

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

          setOpchanState(prev => ({
            ...prev,
            session: {
              currentUser: loadedUser,
              verificationStatus:
                loadedUser?.verificationStatus ?? EVerificationStatus.WALLET_UNCONNECTED,
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
      unsubIdentity = client.userIdentityService.subscribe(async (address: string) => {
        try {
          const { session } = getOpchanState();
          const active = session.currentUser;
          if (!active || active.address !== address) {
            return;
          }

          const identity = await client.userIdentityService.getIdentity(address);
          if (!identity) {
            return;
          }

          const updated: User = {
            ...active,
            ...identity,
          };

          try { 
            await client.database.storeUser(updated); 
          } catch (persistErr) { 
            console.warn('[StoreWiring] Failed to persist updated user after identity refresh:', persistErr);
          }

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

    hydrate().then(() => {
      wire();
    });

    return () => {
      unsubHealth?.();
      unsubMessages?.();
      unsubIdentity?.();
    };
  }, [client]);

  return null;
};