import { useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { OpchanMessage } from '@/types/forum';

export const useMessageSigning = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useMessageSigning must be used within an AuthProvider');
  }

  const {
    signMessage: contextSignMessage,
    verifyMessage: contextVerifyMessage,
    getDelegationStatus,
  } = context;

  const signMessage = useCallback(
    async (message: OpchanMessage): Promise<OpchanMessage | null> => {
      // Check if we have a valid delegation before attempting to sign
      const delegationStatus = await getDelegationStatus();
      if (!delegationStatus.isValid) {
        console.warn('No valid delegation found. Cannot sign message.');
        return null;
      }

      return contextSignMessage(message);
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
