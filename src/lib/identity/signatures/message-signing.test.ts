import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageSigning } from './message-signing';
import { KeyDelegation } from './key-delegation';
import { MessageType, PostMessage } from '@/lib/waku/types';

// Mock the KeyDelegation class
vi.mock('./key-delegation');

// Mock the WalletSignatureVerifier
vi.mock('./wallet-signature-verifier', () => ({
  WalletSignatureVerifier: {
    verifyWalletSignature: vi.fn().mockReturnValue(true)
  }
}));

describe('MessageSigning with Delegation Chain Verification', () => {
  let messageSigning: MessageSigning;
  let mockKeyDelegation: KeyDelegation;

  beforeEach(() => {
    // Create a mock delegation
    const mockDelegation = {
      signature: 'mock-wallet-signature',
      expiryTimestamp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      browserPublicKey: 'mock-browser-public-key',
      browserPrivateKey: 'mock-browser-private-key',
      walletAddress: 'mock-wallet-address',
      walletType: 'bitcoin' as const,
      walletPublicKey: 'mock-wallet-public-key' // Add wallet public key for verification
    };

    // Setup mock methods
    mockKeyDelegation = {
      isDelegationValid: vi.fn().mockReturnValue(true),
      retrieveDelegation: vi.fn().mockReturnValue(mockDelegation),
      signMessage: vi.fn().mockReturnValue('mock-message-signature'),
      verifySignature: vi.fn().mockReturnValue(true),
      createDelegationMessage: vi.fn().mockReturnValue('I, mock-wallet-address, delegate authority to this pubkey: mock-browser-public-key until 1234567890'),
      getDelegationTimeRemaining: vi.fn().mockReturnValue(24 * 60 * 60 * 1000),
      clearDelegation: vi.fn(),
      getBrowserPublicKey: vi.fn().mockReturnValue('mock-browser-public-key'),
      getDelegatingAddress: vi.fn().mockReturnValue('mock-wallet-address'),
      generateKeypair: vi.fn().mockReturnValue({
        publicKey: 'mock-browser-public-key',
        privateKey: 'mock-browser-private-key'
      }),
      createDelegation: vi.fn().mockReturnValue(mockDelegation),
      storeDelegation: vi.fn()
    };

    // Mock the KeyDelegation constructor
    vi.mocked(KeyDelegation).mockImplementation(() => mockKeyDelegation);

    messageSigning = new MessageSigning(mockKeyDelegation);
  });

  describe('signMessage', () => {
    it('should sign a message with delegation chain information', () => {
      const message: PostMessage = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content'
      };

      const signedMessage = messageSigning.signMessage(message);

      expect(signedMessage).not.toBeNull();
      expect(signedMessage).toHaveProperty('signature', 'mock-message-signature');
      expect(signedMessage).toHaveProperty('browserPubKey', 'mock-browser-public-key');
      expect(signedMessage).toHaveProperty('delegationSignature', 'mock-wallet-signature');
      expect(signedMessage).toHaveProperty('delegationMessage');
      expect(signedMessage).toHaveProperty('delegationExpiry');
    });

    it('should return null when delegation is invalid', () => {
      mockKeyDelegation.isDelegationValid = vi.fn().mockReturnValue(false);

      const message: PostMessage = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content'
      };

      const signedMessage = messageSigning.signMessage(message);
      expect(signedMessage).toBeNull();
    });
  });

  describe('verifyMessage', () => {
    it('should verify a valid message with delegation chain', async () => {
      const message: PostMessage & {
        signature: string;
        browserPubKey: string;
        delegationSignature: string;
        delegationMessage: string;
        delegationExpiry: number;
      } = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content',
        signature: 'mock-message-signature',
        browserPubKey: 'mock-browser-public-key',
        delegationSignature: 'mock-wallet-signature',
        delegationMessage: 'I, mock-wallet-address, delegate authority to this pubkey: mock-browser-public-key until 1234567890',
        delegationExpiry: Date.now() + 24 * 60 * 60 * 1000
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(true);
    });

    it('should reject message with missing signature fields', async () => {
      const message: PostMessage = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content'
        // Missing signature fields
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(false);
    });

    it('should reject message with missing delegation fields', async () => {
      const message: PostMessage & {
        signature: string;
        browserPubKey: string;
      } = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content',
        signature: 'mock-message-signature',
        browserPubKey: 'mock-browser-public-key'
        // Missing delegation fields
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(false);
    });

    it('should reject message with invalid signature', async () => {
      mockKeyDelegation.verifySignature = vi.fn().mockReturnValue(false);

      const message: PostMessage & {
        signature: string;
        browserPubKey: string;
        delegationSignature: string;
        delegationMessage: string;
        delegationExpiry: number;
      } = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content',
        signature: 'invalid-signature',
        browserPubKey: 'mock-browser-public-key',
        delegationSignature: 'mock-wallet-signature',
        delegationMessage: 'I, mock-wallet-address, delegate authority to this pubkey: mock-browser-public-key until 1234567890',
        delegationExpiry: Date.now() + 24 * 60 * 60 * 1000
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(false);
    });

    it('should reject message with expired delegation', async () => {
      const message: PostMessage & {
        signature: string;
        browserPubKey: string;
        delegationSignature: string;
        delegationMessage: string;
        delegationExpiry: number;
      } = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content',
        signature: 'mock-message-signature',
        browserPubKey: 'mock-browser-public-key',
        delegationSignature: 'mock-wallet-signature',
        delegationMessage: 'I, mock-wallet-address, delegate authority to this pubkey: mock-browser-public-key until 1234567890',
        delegationExpiry: Date.now() - 24 * 60 * 60 * 1000 // Expired 24 hours ago
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(false);
    });

    it('should reject message with tampered delegation message', async () => {
      const message: PostMessage & {
        signature: string;
        browserPubKey: string;
        delegationSignature: string;
        delegationMessage: string;
        delegationExpiry: number;
      } = {
        type: MessageType.POST,
        timestamp: Date.now(),
        author: 'mock-wallet-address',
        id: 'test-post-1',
        cellId: 'test-cell-1',
        title: 'Test Post',
        content: 'Test content',
        signature: 'mock-message-signature',
        browserPubKey: 'mock-browser-public-key',
        delegationSignature: 'mock-wallet-signature',
        delegationMessage: 'I, attacker-address, delegate authority to this pubkey: mock-browser-public-key until 1234567890', // Tampered
        delegationExpiry: Date.now() + 24 * 60 * 60 * 1000
      };

      const isValid = await messageSigning.verifyMessage(message);
      expect(isValid).toBe(false);
    });
  });
});
