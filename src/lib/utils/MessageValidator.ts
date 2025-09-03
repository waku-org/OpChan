import { OpchanMessage, PartialMessage } from '@/types/forum';
import { DelegationManager } from '@/lib/delegation';

interface ValidationReport {
  hasValidSignature: boolean;
  errors: string[];
  isValid: boolean;
}

/**
 * Comprehensive message validation utility
 * Ensures all messages have valid signatures and browserPubKey
 */
export class MessageValidator {
  private delegationManager: DelegationManager;
  // Cache validation results to avoid re-validating the same messages
  private validationCache = new Map<string, { isValid: boolean; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(delegationManager?: DelegationManager) {
    this.delegationManager = delegationManager || new DelegationManager();
  }

  /**
   * Get cached validation result or validate and cache
   */
  private getCachedValidation(messageId: string, message: OpchanMessage): { isValid: boolean; timestamp: number } | null {
    const cached = this.validationCache.get(messageId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Cache validation result
   */
  private cacheValidation(messageId: string, isValid: boolean): void {
    this.validationCache.set(messageId, { isValid, timestamp: Date.now() });
  }

  /**
   * Clear expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.validationCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Validates that a message has required signature fields and valid signature
   */
  async isValidMessage(message: unknown): Promise<boolean> {
    // Check basic structure
    if (!this.hasRequiredFields(message)) {
      return false;
    }

    // Verify signature and delegation proof - we know it's safe to cast here since hasRequiredFields passed
    return await this.delegationManager.verify(message as OpchanMessage);
  }

  /**
   * Checks if message has required signature and browserPubKey fields
   */
  hasRequiredFields(message: unknown): message is PartialMessage & {
    signature: string;
    browserPubKey: string;
    id: string;
    type: string;
    timestamp: number;
    author: string;
  } {
    if (!message || typeof message !== 'object' || message === null) {
      console.warn('MessageValidator: Invalid message object');
      return false;
    }

    const msg = message as PartialMessage;

    // Check for required signature fields
    if (!msg.signature || typeof msg.signature !== 'string') {
      console.warn('MessageValidator: Missing or invalid signature field', {
        messageId: msg.id,
        messageType: msg.type,
        hasSignature: !!msg.signature,
        signatureType: typeof msg.signature,
      });
      return false;
    }

    if (!msg.browserPubKey || typeof msg.browserPubKey !== 'string') {
      console.warn('MessageValidator: Missing or invalid browserPubKey field', {
        messageId: msg.id,
        messageType: msg.type,
        hasBrowserPubKey: !!msg.browserPubKey,
        browserPubKeyType: typeof msg.browserPubKey,
      });
      return false;
    }

    // Check for basic message structure
    if (
      !msg.id ||
      typeof msg.id !== 'string' ||
      !msg.type ||
      typeof msg.type !== 'string' ||
      !msg.timestamp ||
      typeof msg.timestamp !== 'number' ||
      !msg.author ||
      typeof msg.author !== 'string'
    ) {
      console.warn('MessageValidator: Missing required message fields', {
        messageId: msg.id,
        messageType: msg.type,
        timestamp: msg.timestamp,
        author: msg.author,
        types: {
          id: typeof msg.id,
          type: typeof msg.type,
          timestamp: typeof msg.timestamp,
          author: typeof msg.author,
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Validates a batch of messages and returns only valid ones
   */
  async filterValidMessages(messages: unknown[]): Promise<OpchanMessage[]> {
    const validMessages: OpchanMessage[] = [];
    const invalidCount = {
      missingFields: 0,
      invalidSignature: 0,
      total: 0,
    };

    for (const message of messages) {
      try {
        if (!this.hasRequiredFields(message)) {
          invalidCount.missingFields++;
          continue;
        }

        if (!(await this.delegationManager.verify(message as OpchanMessage))) {
          invalidCount.invalidSignature++;
          continue;
        }

        validMessages.push(message as OpchanMessage);
      } catch (error) {
        console.error('MessageValidator: Error validating message', {
          messageId: (message as PartialMessage)?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        invalidCount.total++;
      }
    }

    // Log validation results
    const totalInvalid =
      invalidCount.missingFields +
      invalidCount.invalidSignature +
      invalidCount.total;
    if (totalInvalid > 0) {
      console.warn('MessageValidator: Filtered out invalid messages', {
        totalMessages: messages.length,
        validMessages: validMessages.length,
        invalidMessages: totalInvalid,
        breakdown: invalidCount,
      });
    }

    return validMessages;
  }

  /**
   * Strict validation that throws errors for invalid messages
   */
  async validateMessage(message: unknown): Promise<OpchanMessage> {
    if (!this.hasRequiredFields(message)) {
      const partialMsg = message as PartialMessage;
      throw new Error(
        `Message validation failed: Missing required signature fields (messageId: ${partialMsg?.id})`
      );
    }

    if (!(await this.delegationManager.verify(message as OpchanMessage))) {
      const partialMsg = message as PartialMessage;
      throw new Error(
        `Message validation failed: Invalid signature (messageId: ${partialMsg?.id})`
      );
    }

    return message as OpchanMessage;
  }

  /**
   * Validates message during creation (before sending)
   */
  validateOutgoingMessage(message: unknown): boolean {
    // More lenient validation for outgoing messages that might not be signed yet
    if (!message || typeof message !== 'object' || message === null) {
      console.error('MessageValidator: Invalid outgoing message object');
      return false;
    }

    const msg = message as PartialMessage;

    // Check basic structure
    if (
      !msg.id ||
      typeof msg.id !== 'string' ||
      !msg.type ||
      typeof msg.type !== 'string' ||
      !msg.timestamp ||
      typeof msg.timestamp !== 'number' ||
      !msg.author ||
      typeof msg.author !== 'string'
    ) {
      console.error(
        'MessageValidator: Outgoing message missing required fields',
        {
          id: !!msg.id,
          type: !!msg.type,
          timestamp: !!msg.timestamp,
          author: !!msg.author,
          types: {
            id: typeof msg.id,
            type: typeof msg.type,
            timestamp: typeof msg.timestamp,
            author: typeof msg.author,
          },
        }
      );
      return false;
    }

    return true;
  }

  /**
   * Creates a validation report for debugging
   */
  async getValidationReport(message: unknown): Promise<ValidationReport> {
    const errors: string[] = [];
    let hasRequiredFields = false;
    let hasValidSignature = false;

    try {
      hasRequiredFields = this.hasRequiredFields(message);
      if (!hasRequiredFields) {
        errors.push(
          'Missing required signature fields (signature, browserPubKey)'
        );
      }

      if (hasRequiredFields) {
        hasValidSignature = await this.delegationManager.verify(
          message as OpchanMessage
        );
        if (!hasValidSignature) {
          errors.push('Invalid message signature');
        }
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(errorMsg);
    }

    return {
      isValid: hasRequiredFields && hasValidSignature && errors.length === 0,
      hasRequiredFields,
      hasValidSignature,
      errors,
    };
  }
}

/**
 * Global validator instance
 */
export const messageValidator = new MessageValidator();

/**
 * Type guard function for convenient usage
 * Note: This is not a true type guard since it's async
 */
export async function isValidOpchanMessage(message: unknown): Promise<boolean> {
  return await messageValidator.isValidMessage(message);
}

/**
 * Validation decorator for message processing functions
 */
export function validateMessage(
  _target: unknown,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    // Assume first argument is the message
    const message = args[0];

    if (!messageValidator.isValidMessage(message)) {
      const partialMsg = message as PartialMessage;
      console.warn(`${propertyName}: Rejecting invalid message`, {
        messageId: partialMsg?.id,
        messageType: partialMsg?.type,
      });
      return null; // or throw an error depending on the use case
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}
