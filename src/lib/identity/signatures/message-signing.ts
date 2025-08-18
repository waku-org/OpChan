import { OpchanMessage } from '@/types';
import { KeyDelegation } from './key-delegation';
import { WalletSignatureVerifier } from './wallet-signature-verifier';

export class MessageSigning {
  private keyDelegation: KeyDelegation;
  
  constructor(keyDelegation: KeyDelegation) {
    this.keyDelegation = keyDelegation;
  }
  
  signMessage<T extends OpchanMessage>(message: T): T | null {
    if (!this.keyDelegation.isDelegationValid()) {
      console.error('No valid key delegation found. Cannot sign message.');
      return null;
    }
    
    const delegation = this.keyDelegation.retrieveDelegation();
    if (!delegation) return null;
    
    const messageToSign = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
      delegationSignature: undefined,
      delegationMessage: undefined,
      delegationExpiry: undefined
    });
    
    const signature = this.keyDelegation.signMessage(messageToSign);
    if (!signature) return null;
    
    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey,
      delegationSignature: delegation.signature,
      delegationMessage: this.keyDelegation.createDelegationMessage(
        delegation.browserPublicKey,
        delegation.walletAddress,
        delegation.expiryTimestamp
      ),
      delegationExpiry: delegation.expiryTimestamp
    };
  }
  
  async verifyMessage(message: OpchanMessage & {
    signature?: string;
    browserPubKey?: string;
    delegationSignature?: string;
    delegationMessage?: string;
    delegationExpiry?: number;
  }): Promise<boolean> {
    // Check for required signature fields
    if (!message.signature || !message.browserPubKey) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn('Message is missing signature information', messageId);
      return false;
    }

    // Check for required delegation fields
    if (!message.delegationSignature || !message.delegationMessage || !message.delegationExpiry) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn('Message is missing delegation information', messageId);
      return false;
    }
    
    // 1. Verify the message signature
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
      delegationSignature: undefined,
      delegationMessage: undefined,
      delegationExpiry: undefined
    });
    
    const isValidMessageSignature = this.keyDelegation.verifySignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );
    
    if (!isValidMessageSignature) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn(`Invalid message signature for message ${messageId}`);
      return false;
    }
    
    // 2. Verify delegation hasn't expired
    const now = Date.now();
    if (now >= message.delegationExpiry) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn(`Delegation expired for message ${messageId}`);
      return false;
    }
    
    // 3. Verify delegation message integrity
    const expectedDelegationMessage = this.keyDelegation.createDelegationMessage(
      message.browserPubKey,
      message.author,
      message.delegationExpiry
    );
    
    if (message.delegationMessage !== expectedDelegationMessage) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn(`Delegation message tampered for message ${messageId}`);
      return false;
    }
    
    // 4. Verify wallet signature of delegation
    const isValidDelegationSignature = await this.verifyWalletSignature(
      message.delegationMessage,
      message.delegationSignature,
      message.author
    );
    
    if (!isValidDelegationSignature) {
      const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
      console.warn(`Invalid delegation signature for message ${messageId}`);
      return false;
    }
    
    return true;
  }

  /**
   * Verify wallet signature of delegation message
   * Uses proper cryptographic verification based on wallet type
   */
  private async verifyWalletSignature(
    delegationMessage: string,
    signature: string,
    walletAddress: string
  ): Promise<boolean> {
    // Get the wallet type from the delegation
    const delegation = this.keyDelegation.retrieveDelegation();
    if (!delegation) {
      console.warn('No delegation found for wallet signature verification');
      return false;
    }
    
    // Use the proper wallet signature verifier with public key
    return await WalletSignatureVerifier.verifyWalletSignature(
      delegationMessage,
      signature,
      walletAddress,
      delegation.walletType,
      delegation.walletPublicKey
    );
  }
} 