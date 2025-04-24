import { OpchanMessage } from '@/types';
import { KeyDelegation } from './key-delegation';


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
    if (!message.signature || !message.browserPubKey) {
      console.warn('Message is missing signature information');
      return false;
    }
    
    const signedContent = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined
    });
    
    return  this.keyDelegation.verifySignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );
  }
} 