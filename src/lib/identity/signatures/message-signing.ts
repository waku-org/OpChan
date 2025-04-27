import { OpchanMessage } from '@/types';
import { KeyDelegation } from './key-delegation';

// Maximum age of a message in milliseconds (24 hours)
const MAX_MESSAGE_AGE = 24 * 60 * 60 * 1000;

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
      browserPubKey: undefined
    });
    
    const signature = this.keyDelegation.signMessage(messageToSign);
    if (!signature) return null;
    
    return {
      ...message,
      signature,
      browserPubKey: delegation.browserPublicKey
    };
  }
  
  verifyMessage(message: OpchanMessage): boolean {
    // Check for required signature fields
    if (!message.signature || !message.browserPubKey) {
      console.warn('Message is missing signature information', message.id);
      return false;
    }

    // Check if message is too old (anti-replay protection)
    if (this.isMessageTooOld(message)) {
      console.warn(`Message ${message.id} is too old (timestamp: ${message.timestamp})`);
      return false;
    }
    
    // Reconstruct the original signed content
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined
    });
    
    // Verify the signature
    const isValid = this.keyDelegation.verifySignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );
    
    if (!isValid) {
      console.warn(`Invalid signature for message ${message.id}`);
    }
    
    return isValid;
  }

  /**
   * Checks if a message's timestamp is older than the maximum allowed age
   */
  private isMessageTooOld(message: OpchanMessage): boolean {
    if (!message.timestamp) return true;
    
    const currentTime = Date.now();
    const messageAge = currentTime - message.timestamp;
    
    return messageAge > MAX_MESSAGE_AGE;
  }
} 