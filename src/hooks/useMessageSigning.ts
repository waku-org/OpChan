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
    isDelegationValid,
  } = context;

  const signMessage = useCallback(
    async (message: OpchanMessage): Promise<OpchanMessage | null> => {
      // Check if we have a valid delegation before attempting to sign
      if (!isDelegationValid()) {
        console.warn('No valid delegation found. Cannot sign message.');
        return null;
      }

      return contextSignMessage(message);
    },
    [contextSignMessage, isDelegationValid]
  );

  const verifyMessage = useCallback(
    (message: OpchanMessage): boolean => {
      return contextVerifyMessage(message);
    },
    [contextVerifyMessage]
  );

  const canSignMessages = useCallback((): boolean => {
    return isDelegationValid();
  }, [isDelegationValid]);

  return {
    // Message signing
    signMessage,
    verifyMessage,
    canSignMessages,
  };
};
