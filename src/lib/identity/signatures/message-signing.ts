import { OpchanMessage } from '@/types';
import { KeyDelegation } from './key-delegation';
import { WalletSignatureVerifier } from './wallet-signature-verifier';

export class MessageSigning {
  private keyDelegation: KeyDelegation;
  
  constructor(keyDelegation: KeyDelegation) {
    this.keyDelegation = keyDelegation;
  }
  
  signMessage<T extends OpchanMessage>(message: T): T | null {
    const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
    console.log(`✍️ Starting message signing for: ${messageId}`);
    
    if (!this.keyDelegation.isDelegationValid()) {
      console.error(`❌ No valid key delegation found. Cannot sign message: ${messageId}`);
      return null;
    }
    
    const delegation = this.keyDelegation.retrieveDelegation();
    if (!delegation) {
      console.error(`❌ No delegation found. Cannot sign message: ${messageId}`);
      return null;
    }
    
    console.log(`🔑 Using delegation for signing:`, {
      walletAddress: delegation.walletAddress,
      walletType: delegation.walletType,
      browserPubKey: delegation.browserPublicKey.slice(0, 16) + '...',
      expiresAt: new Date(delegation.expiryTimestamp).toISOString()
    });
    
    const messageToSign = JSON.stringify({
      ...message,
      signature: undefined,
      browserPubKey: undefined,
      delegationSignature: undefined,
      delegationMessage: undefined,
      delegationExpiry: undefined
    });
    
    console.log(`📝 Signing message content for ${messageId}:`, {
      contentLength: messageToSign.length,
      messageType: message.type
    });
    
    const signature = this.keyDelegation.signMessage(messageToSign);
    if (!signature) {
      console.error(`❌ Failed to sign message: ${messageId}`);
      return null;
    }
    
    console.log(`✅ Message signed successfully for ${messageId}:`, {
      signatureLength: signature.length,
      signaturePrefix: signature.slice(0, 16) + '...'
    });
    
    const signedMessage = {
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
    
    console.log(`🎉 Message signing completed for ${messageId} with delegation chain`);
    
    return signedMessage;
  }
  
  async verifyMessage(message: OpchanMessage & {
    signature?: string;
    browserPubKey?: string;
    delegationSignature?: string;
    delegationMessage?: string;
    delegationExpiry?: number;
  }): Promise<boolean> {
    const messageId = 'id' in message ? message.id : `${message.type}-${message.timestamp}`;
    console.log(`🔍 Starting verification for message: ${messageId}`);
    
    // Check for required signature fields
    if (!message.signature || !message.browserPubKey) {
      console.warn(`❌ Message ${messageId} missing signature information:`, {
        hasSignature: !!message.signature,
        hasBrowserPubKey: !!message.browserPubKey
      });
      return false;
    }

    // Check for required delegation fields
    if (!message.delegationSignature || !message.delegationMessage || !message.delegationExpiry) {
      console.warn(`❌ Message ${messageId} missing delegation information:`, {
        hasDelegationSignature: !!message.delegationSignature,
        hasDelegationMessage: !!message.delegationMessage,
        hasDelegationExpiry: !!message.delegationExpiry
      });
      return false;
    }
    
    console.log(`✅ Message ${messageId} has all required fields`);
    
    // Log delegation details for debugging
    const delegation = this.keyDelegation.retrieveDelegation();
    if (delegation) {
      console.log(`🔍 Current delegation details:`, {
        storedWalletAddress: delegation.walletAddress,
        messageAuthorAddress: message.author,
        addressesMatch: delegation.walletAddress === message.author,
        walletType: delegation.walletType,
        hasWalletPublicKey: !!delegation.walletPublicKey
      });
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
    
    console.log(`🔐 Verifying message signature for ${messageId} with browser key: ${message.browserPubKey.slice(0, 16)}...`);
    
    const isValidMessageSignature = this.keyDelegation.verifySignature(
      signedContent,
      message.signature,
      message.browserPubKey
    );
    
    if (!isValidMessageSignature) {
      console.warn(`❌ Invalid message signature for ${messageId}`);
      return false;
    }
    
    console.log(`✅ Message signature verified for ${messageId}`);
    
    // 2. Verify delegation hasn't expired
    const now = Date.now();
    const timeUntilExpiry = message.delegationExpiry - now;
    
    console.log(`⏰ Checking delegation expiry for ${messageId}:`, {
      currentTime: new Date(now).toISOString(),
      expiryTime: new Date(message.delegationExpiry).toISOString(),
      timeUntilExpiry: `${Math.round(timeUntilExpiry / 1000 / 60)} minutes`
    });
    
    if (now >= message.delegationExpiry) {
      console.warn(`❌ Delegation expired for ${messageId}`, {
        expiredBy: `${Math.round(-timeUntilExpiry / 1000 / 60)} minutes`
      });
      return false;
    }
    
    console.log(`✅ Delegation not expired for ${messageId}`);
    
    // 3. Verify delegation message integrity
    const expectedDelegationMessage = this.keyDelegation.createDelegationMessage(
      message.browserPubKey,
      message.author,
      message.delegationExpiry
    );
    
    console.log(`🔗 Verifying delegation message integrity for ${messageId}:`, {
      expected: expectedDelegationMessage,
      actual: message.delegationMessage,
      matches: message.delegationMessage === expectedDelegationMessage
    });
    
    if (message.delegationMessage !== expectedDelegationMessage) {
      console.warn(`❌ Delegation message tampered for ${messageId}`);
      return false;
    }
    
    console.log(`✅ Delegation message integrity verified for ${messageId}`);
    
    // 4. Verify wallet signature of delegation
    console.log(`🔑 Verifying wallet signature for ${messageId} from author: ${message.author}`);
    
    const isValidDelegationSignature = await this.verifyWalletSignature(
      message.delegationMessage,
      message.delegationSignature,
      message.author
    );
    
    console.log(`🔍 Delegation verification details:`, {
      delegationMessage: message.delegationMessage,
      delegationSignature: message.delegationSignature,
      signatureLength: message.delegationSignature?.length,
      messageAuthor: message.author,
      storedDelegation: delegation ? {
        signature: delegation.signature,
        signatureLength: delegation.signature?.length,
        walletAddress: delegation.walletAddress
      } : 'no delegation found'
    });
    
    if (!isValidDelegationSignature) {
      console.warn(`❌ Invalid delegation signature for ${messageId}`);
      console.log(`🔍 Delegation signature verification failed. This could indicate:`, {
        reason: 'Address mismatch between delegation creation and current wallet',
        suggestion: 'User may have switched wallets or accounts. Try creating a new delegation.',
        delegationMessage: message.delegationMessage,
        delegationSignature: message.delegationSignature.slice(0, 32) + '...',
        expectedAuthor: message.author
      });
      
      // Show a user-friendly error message
      console.error(`🚨 SECURITY ALERT: Delegation signature verification failed for message ${messageId}. 
      
This usually means:
1. You switched wallet accounts since creating the delegation
2. You're using a different wallet than the one that created the delegation
3. Your wallet address changed (e.g., switching networks)

To fix this:
1. Go to your profile/settings
2. Click "Clear Delegation" 
3. Create a new delegation with your current wallet

This ensures your messages are properly authenticated with your current wallet address.`);
      
      return false;
    }
    
    console.log(`✅ Wallet signature verified for ${messageId}`);
    console.log(`🎉 All verifications passed for message: ${messageId}`);
    
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