import React from 'react';
import { useClient } from '../context/ClientContext';
import { setOpchanState, getOpchanState, opchanStore } from '../store/opchanStore';
import type { OpchanMessage, User, UserIdentity } from '@opchan/core';
import { EVerificationStatus, getDataFromCache } from '@opchan/core';

export const StoreWiring: React.FC = () => {
  const client = useClient();

  // Initial hydrate from LocalDatabase
  React.useEffect(() => {
    let unsubHealth: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;
    let unsubIdentity: (() => void) | null = null;
    let unsubPersistence: (() => void) | null = null;

    const hydrate = async () => {
      try {
        await client.database.open();
        const { cells, posts, comments } = await getDataFromCache();

        // Reflect transformed content
        setOpchanState(prev => ({
          ...prev,
          content: {
            ...prev.content,
            cells,
            posts,
            comments,
            bookmarks: Object.values(client.database.cache.bookmarks),
            lastSync: client.database.getSyncState().lastSync,
            pendingIds: new Set<string>(),
            pendingVotes: new Set<string>(),
          },
        }));

        // Hydrate identity cache from LocalDatabase using UserIdentityService
        const allIdentities = client.userIdentityService.getAll();
        const identityUpdates: Record<string, UserIdentity> = {};
        const displayNameUpdates: Record<string, string> = {};
        const lastUpdatedMap: Record<string, number> = {};

        for (const identity of allIdentities) {
          identityUpdates[identity.address] = identity;
          displayNameUpdates[identity.address] = identity.displayName;
          lastUpdatedMap[identity.address] = identity.lastUpdated;
        }

        setOpchanState(prev => ({
          ...prev,
          identity: {
            ...prev.identity,
            identitiesByAddress: identityUpdates,
            displayNameByAddress: displayNameUpdates,
            lastUpdatedByAddress: lastUpdatedMap,
          },
        }));

        // Hydrate session (user + delegation) from LocalDatabase
        try {
          const loadedUser = await client.database.loadUser();
          const delegationStatus = loadedUser?.address
            ? await client.delegation.getStatus(loadedUser.address)
            : null;

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
      } finally {
        // Mark hydration as complete regardless of success or failure
        // This allows forum actions even when no content is loaded
        setOpchanState(prev => ({
          ...prev,
          network: {
            ...prev.network,
            isHydrated: true,
          },
        }));
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
          const { cells, posts, comments } = await getDataFromCache();
          setOpchanState(prev => ({
            ...prev,
            content: {
              ...prev.content,
              cells,
              posts,
              comments,
              bookmarks: Object.values(client.database.cache.bookmarks),
              lastSync: Date.now(),
              pendingIds: prev.content.pendingIds,
              pendingVotes: prev.content.pendingVotes,
            },
          }));
        } catch (e) {
          console.error('Failed to apply incoming message', e);
        }
      });

      // Reactively update ALL identities when they refresh (not just current user)
      unsubIdentity = client.userIdentityService.subscribe(async (address: string, identity: UserIdentity | null) => {
        try {
          if (!identity) {
            // Try to fetch if not provided
            identity = await client.userIdentityService.getIdentity(address);
            if (!identity) {
              return;
            }
          }

          // Update identity store for ALL users
          opchanStore.setIdentity(address, identity);

          // Special handling for current user - also update session
          const { session } = getOpchanState();
          const active = session.currentUser;
          if (active && active.address === address) {
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
          }

          const { cells, posts, comments } = await getDataFromCache();
          setOpchanState(prev => ({
            ...prev,
            content: {
              ...prev.content,
              cells,
              posts,
              comments,
              bookmarks: Object.values(client.database.cache.bookmarks),
              lastSync: Date.now(),
              pendingIds: prev.content.pendingIds,
              pendingVotes: prev.content.pendingVotes,
            },
          }));
        } catch (err) {
          console.warn('Identity refresh wiring failed', err);
        }
      });
    };

    hydrate().then(() => {
      wire();
      
      // Set up bidirectional persistence: Store → LocalDatabase
      unsubPersistence = opchanStore.onPersistence(async (state) => {
        try {
          // Persist current user changes
          if (state.session.currentUser) {
            await client.database.storeUser(state.session.currentUser);
          }

          // Persist UI state changes (wizard flags, preferences)
          for (const [key, value] of Object.entries(state.uiState.wizardStates)) {
            await client.database.storeUIState(`wizard_${key}`, value);
          }
          
          for (const [key, value] of Object.entries(state.uiState.preferences)) {
            await client.database.storeUIState(`pref_${key}`, value);
          }

          // Persist identity updates back to LocalDatabase
          for (const [address, identity] of Object.entries(state.identity.identitiesByAddress)) {
            await client.database.upsertUserIdentity(address, identity);
          }
        } catch (error) {
          console.warn('[StoreWiring] Persistence failed:', error);
        }
      });
    });

    return () => {
      unsubHealth?.();
      unsubMessages?.();
      unsubIdentity?.();
      unsubPersistence?.();
    };
  }, [client]);

  return null;
};