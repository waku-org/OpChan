import { OpchanMessage } from '@/types/forum';
import { UnsignedMessage } from '@/types/waku';
import { DelegationManager } from '@/lib/delegation';
import messageManager from '@/lib/waku';

export interface MessageResult {
  success: boolean;
  message?: OpchanMessage;
  error?: string;
}

export interface MessageServiceInterface {
  sendMessage(message: UnsignedMessage): Promise<MessageResult>;
  verifyMessage(message: OpchanMessage): Promise<boolean>;
}

export class MessageService implements MessageServiceInterface {
  private delegationManager: DelegationManager;

  constructor(delegationManager: DelegationManager) {
    this.delegationManager = delegationManager;
  }

  /**
   * Sign and send a message to the Waku network
   */
  async sendMessage(message: UnsignedMessage): Promise<MessageResult> {
    try {
      const signedMessage = this.delegationManager.signMessage(message);

      if (!signedMessage) {
        // Check if delegation exists but is expired
        const delegationStatus = this.delegationManager.getStatus();
        const isDelegationExpired = !delegationStatus.isValid;

        return {
          success: false,
          error: isDelegationExpired
            ? 'Key delegation expired. Please re-delegate your key through the profile menu.'
            : 'Key delegation required. Please delegate a signing key from your profile menu to post without wallet approval for each action.',
        };
      }

      await messageManager.sendMessage(signedMessage);

      return {
        success: true,
        message: signedMessage,
      };
    } catch (error) {
      console.error('Error signing and sending message:', error);

      let errorMessage = 'Failed to sign and send message. Please try again.';

      if (error instanceof Error) {
        if (
          error.message.includes('timeout') ||
          error.message.includes('network')
        ) {
          errorMessage =
            'Network issue detected. Please check your connection and try again.';
        } else if (
          error.message.includes('rejected') ||
          error.message.includes('denied')
        ) {
          errorMessage =
            'Wallet signature request was rejected. Please approve signing to continue.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify a message signature
   */
  async verifyMessage(message: OpchanMessage): Promise<boolean> {
    return await this.delegationManager.verify(message);
  }
}
