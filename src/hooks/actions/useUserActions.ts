import { useCallback, useState } from 'react';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/hooks/core/useEnhancedAuth';
import { EDisplayPreference } from '@/types/identity';
import { useToast } from '@/components/ui/use-toast';

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

/**
 * Hook for user profile and identity actions
 */
export function useUserActions(): UserActions {
  const { userIdentityService } = useForum();
  const { currentUser, permissions } = useAuth();
  const { toast } = useToast();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingCallSign, setIsUpdatingCallSign] = useState(false);
  const [isUpdatingDisplayPreference, setIsUpdatingDisplayPreference] =
    useState(false);

  // Update call sign
  const updateCallSign = useCallback(
    async (callSign: string): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        toast({
          title: 'Permission Denied',
          description:
            'You need to connect your wallet to update your profile.',
          variant: 'destructive',
        });
        return false;
      }

      if (!userIdentityService || !currentUser) {
        toast({
          title: 'Service Unavailable',
          description: 'User identity service is not available.',
          variant: 'destructive',
        });
        return false;
      }

      if (!callSign.trim()) {
        toast({
          title: 'Invalid Input',
          description: 'Call sign cannot be empty.',
          variant: 'destructive',
        });
        return false;
      }

      // Basic validation for call sign
      if (callSign.length < 3 || callSign.length > 20) {
        toast({
          title: 'Invalid Call Sign',
          description: 'Call sign must be between 3 and 20 characters.',
          variant: 'destructive',
        });
        return false;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(callSign)) {
        toast({
          title: 'Invalid Call Sign',
          description:
            'Call sign can only contain letters, numbers, underscores, and hyphens.',
          variant: 'destructive',
        });
        return false;
      }

      setIsUpdatingCallSign(true);

      try {
        const success = await userIdentityService.updateUserProfile(
          currentUser.address,
          callSign,
          currentUser.displayPreference
        );

        if (success) {
          toast({
            title: 'Call Sign Updated',
            description: `Your call sign has been set to "${callSign}".`,
          });
          return true;
        } else {
          toast({
            title: 'Update Failed',
            description: 'Failed to update call sign. Please try again.',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Failed to update call sign:', error);
        toast({
          title: 'Update Failed',
          description: 'An error occurred while updating your call sign.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsUpdatingCallSign(false);
      }
    },
    [permissions.canUpdateProfile, userIdentityService, currentUser, toast]
  );

  // Update display preference
  const updateDisplayPreference = useCallback(
    async (preference: EDisplayPreference): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        toast({
          title: 'Permission Denied',
          description:
            'You need to connect your wallet to update your profile.',
          variant: 'destructive',
        });
        return false;
      }

      if (!userIdentityService || !currentUser) {
        toast({
          title: 'Service Unavailable',
          description: 'User identity service is not available.',
          variant: 'destructive',
        });
        return false;
      }

      setIsUpdatingDisplayPreference(true);

      try {
        const success = await userIdentityService.updateUserProfile(
          currentUser.address,
          currentUser.callSign || '',
          preference
        );

        if (success) {
          const preferenceLabel =
            preference === EDisplayPreference.CALL_SIGN
              ? 'Call Sign'
              : 'Wallet Address';

          toast({
            title: 'Display Preference Updated',
            description: `Your display preference has been set to "${preferenceLabel}".`,
          });
          return true;
        } else {
          toast({
            title: 'Update Failed',
            description:
              'Failed to update display preference. Please try again.',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Failed to update display preference:', error);
        toast({
          title: 'Update Failed',
          description:
            'An error occurred while updating your display preference.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsUpdatingDisplayPreference(false);
      }
    },
    [permissions.canUpdateProfile, userIdentityService, currentUser, toast]
  );

  // Update profile (multiple fields at once)
  const updateProfile = useCallback(
    async (updates: {
      callSign?: string;
      displayPreference?: EDisplayPreference;
    }): Promise<boolean> => {
      if (!permissions.canUpdateProfile) {
        toast({
          title: 'Permission Denied',
          description:
            'You need to connect your wallet to update your profile.',
          variant: 'destructive',
        });
        return false;
      }

      if (!userIdentityService || !currentUser) {
        toast({
          title: 'Service Unavailable',
          description: 'User identity service is not available.',
          variant: 'destructive',
        });
        return false;
      }

      setIsUpdatingProfile(true);

      try {
        let success = true;
        const updatePromises: Promise<boolean>[] = [];

        // Update call sign if provided
        if (updates.callSign !== undefined) {
          updatePromises.push(
            userIdentityService.updateUserProfile(
              currentUser.address,
              updates.callSign,
              currentUser.displayPreference
            )
          );
        }

        // Update display preference if provided
        if (updates.displayPreference !== undefined) {
          updatePromises.push(
            userIdentityService.updateUserProfile(
              currentUser.address,
              currentUser.callSign || '',
              updates.displayPreference
            )
          );
        }

        if (updatePromises.length > 0) {
          const results = await Promise.all(updatePromises);
          success = results.every(result => result);
        }

        if (success) {
          toast({
            title: 'Profile Updated',
            description: 'Your profile has been updated successfully.',
          });
          return true;
        } else {
          toast({
            title: 'Update Failed',
            description: 'Some profile updates failed. Please try again.',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Failed to update profile:', error);
        toast({
          title: 'Update Failed',
          description: 'An error occurred while updating your profile.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsUpdatingProfile(false);
      }
    },
    [permissions.canUpdateProfile, userIdentityService, currentUser, toast]
  );

  // Clear call sign
  const clearCallSign = useCallback(async (): Promise<boolean> => {
    return updateCallSign('');
  }, [updateCallSign]);

  return {
    // States
    isUpdatingProfile,
    isUpdatingCallSign,
    isUpdatingDisplayPreference,

    // Actions
    updateCallSign,
    updateDisplayPreference,
    updateProfile,
    clearCallSign,
  };
}
