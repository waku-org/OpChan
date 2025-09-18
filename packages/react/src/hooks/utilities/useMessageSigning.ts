import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { OpchanMessage } from '@opchan/core';

export const useMessageSigning = () => {
  const {
    signMessage: contextSignMessage,
    verifyMessage: contextVerifyMessage,
    getDelegationStatus,
  } = useAuth();

  const signMessage = useCallback(
    async (message: OpchanMessage): Promise<void> => {
      // Check if we have a valid delegation before attempting to sign
      const delegationStatus = await getDelegationStatus();
      if (!delegationStatus.isValid) {
        console.warn('No valid delegation found. Cannot sign message.');
        return;
      }

      await contextSignMessage(message);
    },
    [contextSignMessage, getDelegationStatus]
  );

  const verifyMessage = useCallback(
    async (message: OpchanMessage): Promise<boolean> => {
      return await contextVerifyMessage(message);
    },
    [contextVerifyMessage]
  );

  const canSignMessages = useCallback(async (): Promise<boolean> => {
    const delegationStatus = await getDelegationStatus();
    return delegationStatus.isValid;
  }, [getDelegationStatus]);

  return {
    // Message signing
    signMessage,
    verifyMessage,
    canSignMessages,
  };
};
