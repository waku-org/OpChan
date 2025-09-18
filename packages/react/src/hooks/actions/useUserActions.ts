import { useCallback, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../core/usePermissions';
import { EDisplayPreference, localDatabase } from '@opchan/core';

export interface UserActionStates {
  isUpdatingProfile: boolean;
  isUpdatingCallSign: boolean;
  isUpdatingDisplayPreference: boolean;
}

export interface UserActions extends UserActionStates {
  updateCallSign: (callSign: string) => Promise<boolean>;
  updateDisplayPreference: (preference: EDisplayPreference) => Promise<boolean>;
  updateProfile: (updates: {
    callSign?: string;
    displayPreference?: EDisplayPreference;
  }) => Promise<boolean>;
  clearCallSign: () => Promise<boolean>;
}

export function useUserActions(): UserActions {
  const { currentUser } = useAuth();
  const permissions = usePermissions();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingCallSign, setIsUpdatingCallSign] = useState(false);
  const [isUpdatingDisplayPreference, setIsUpdatingDisplayPreference] =
    useState(false);

  const updateCallSign = useCallback(
    async (callSign: string): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        throw new Error('You need to connect your wallet to update your profile.');
      }

      if (!currentUser) {
        throw new Error('User identity service is not available.');
      }

      if (!callSign.trim()) {
        throw new Error('Call sign cannot be empty.');
      }

      if (callSign.length < 3 || callSign.length > 20) {
        throw new Error('Call sign must be between 3 and 20 characters.');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(callSign)) {
        throw new Error(
          'Call sign can only contain letters, numbers, underscores, and hyphens.'
        );
      }

      setIsUpdatingCallSign(true);
      try {
        await localDatabase.upsertUserIdentity(currentUser.address, {
          callSign,
          lastUpdated: Date.now(),
        });
        return true;
      } catch (error) {
        console.error('Failed to update call sign:', error);
        throw new Error('An error occurred while updating your call sign.');
      } finally {
        setIsUpdatingCallSign(false);
      }
    },
    [permissions.canUpdateProfile, currentUser]
  );

  const updateDisplayPreference = useCallback(
    async (preference: EDisplayPreference): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        throw new Error('You need to connect your wallet to update your profile.');
      }

      if (!currentUser) {
        throw new Error('User identity service is not available.');
      }

      setIsUpdatingDisplayPreference(true);
      try {
        // Persist to central identity store
        await localDatabase.upsertUserIdentity(currentUser.address, {
          displayPreference: preference,
          lastUpdated: Date.now(),
        });
        // Also persist on the lightweight user record if present
        await localDatabase.storeUser({
          ...currentUser,
          displayPreference: preference,
          lastChecked: Date.now(),
        });
        return true;
      } catch (error) {
        console.error('Failed to update display preference:', error);
        throw new Error('An error occurred while updating your display preference.');
      } finally {
        setIsUpdatingDisplayPreference(false);
      }
    },
    [permissions.canUpdateProfile, currentUser]
  );

  const updateProfile = useCallback(
    async (updates: {
      callSign?: string;
      displayPreference?: EDisplayPreference;
    }): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        throw new Error('You need to connect your wallet to update your profile.');
      }

      if (!currentUser) {
        throw new Error('User identity service is not available.');
      }

      setIsUpdatingProfile(true);
      try {
        // Write a consolidated identity update to IndexedDB
        await localDatabase.upsertUserIdentity(currentUser.address, {
          ...(updates.callSign !== undefined ? { callSign: updates.callSign } : {}),
          ...(updates.displayPreference !== undefined
            ? { displayPreference: updates.displayPreference }
            : {}),
          lastUpdated: Date.now(),
        });

        // Update user lightweight record for displayPreference if present
        if (updates.displayPreference !== undefined) {
          await localDatabase.storeUser({
            ...currentUser,
            displayPreference: updates.displayPreference,
            lastChecked: Date.now(),
          } as any);
        }

        // Also call granular updaters for validation side-effects
        if (updates.callSign !== undefined) {
          await updateCallSign(updates.callSign);
        }
        if (updates.displayPreference !== undefined) {
          await updateDisplayPreference(updates.displayPreference);
        }

        return true;
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw new Error('An error occurred while updating your profile.');
      } finally {
        setIsUpdatingProfile(false);
      }
    },
    [permissions.canUpdateProfile, currentUser, updateCallSign, updateDisplayPreference]
  );

  const clearCallSign = useCallback(async (): Promise<boolean> => {
    return updateCallSign('');
  }, [updateCallSign]);

  return {
    isUpdatingProfile,
    isUpdatingCallSign,
    isUpdatingDisplayPreference,
    updateCallSign,
    updateDisplayPreference,
    updateProfile,
    clearCallSign,
  };
}
