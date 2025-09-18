import { OpchanMessage, PartialMessage } from '../../types/forum';
import { DelegationManager } from '../delegation';

interface ValidationReport {
  validMessages: OpchanMessage[];
  invalidMessages: unknown[];
  totalProcessed: number;
  validationErrors: string[];
}

export class MessageValidator {
  private delegationManager?: DelegationManager;

  constructor(delegationManager?: DelegationManager) {
    this.delegationManager = delegationManager;
  }

  private getDelegationManager(): DelegationManager {
    if (!this.delegationManager) {
      this.delegationManager = new DelegationManager();
    }
    return this.delegationManager;
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
    try {
      return await this.getDelegationManager().verify(
        message as unknown as OpchanMessage
      );
    } catch {
      return false;
    }
  }

  /**
   * Checks if message has required signature and browserPubKey fields
   */
  private hasRequiredFields(message: unknown): message is PartialMessage & {
    signature: string;
    browserPubKey: string;
    id: string;
    type: string;
    timestamp: number;
    author: string;
  } {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const msg = message as Record<string, unknown>;

    return (
      typeof msg.signature === 'string' &&
      typeof msg.browserPubKey === 'string' &&
      typeof msg.id === 'string' &&
      typeof msg.type === 'string' &&
      typeof msg.timestamp === 'number' &&
      typeof msg.author === 'string'
    );
  }

  /**
   * Validates multiple messages and returns validation report
   */
  async validateMessages(messages: unknown[]): Promise<ValidationReport> {
    const validMessages: OpchanMessage[] = [];
    const invalidMessages: unknown[] = [];
    const validationErrors: string[] = [];

    for (const message of messages) {
      try {
        // Check basic structure first
        if (!this.hasRequiredFields(message)) {
          invalidMessages.push(message);
          validationErrors.push('Missing required fields');
          continue;
        }

        // Verify signature
        try {
          const isValid = await this.getDelegationManager().verify(
            message as unknown as OpchanMessage
          );
          if (!isValid) {
            invalidMessages.push(message);
            validationErrors.push('Invalid signature');
            continue;
          }
          validMessages.push(message as unknown as OpchanMessage);
        } catch {
          invalidMessages.push(message);
          validationErrors.push('Signature verification failed');
        }
      } catch (error) {
        invalidMessages.push(message);
        validationErrors.push(
          error instanceof Error ? error.message : 'Unknown validation error'
        );
      }
    }

    return {
      validMessages,
      invalidMessages,
      totalProcessed: messages.length,
      validationErrors,
    };
  }

  /**
   * Validates and returns a single message if valid
   */
  async validateSingleMessage(message: unknown): Promise<OpchanMessage> {
    // Check basic structure
    if (!this.hasRequiredFields(message)) {
      throw new Error('Message missing required fields');
    }

    // Verify signature and delegation proof
    try {
      const isValid = await this.getDelegationManager().verify(
        message as unknown as OpchanMessage
      );
      if (!isValid) {
        throw new Error('Invalid message signature');
      }
      return message as unknown as OpchanMessage;
    } catch (error) {
      throw new Error(`Message validation failed: ${error}`);
    }
  }

  /**
   * Batch validation with performance optimization
   */
  async batchValidate(
    messages: unknown[],
    options: {
      maxConcurrent?: number;
      skipInvalid?: boolean;
    } = {}
  ): Promise<ValidationReport> {
    const { maxConcurrent = 10, skipInvalid = true } = options;
    const validMessages: OpchanMessage[] = [];
    const invalidMessages: unknown[] = [];
    const validationErrors: string[] = [];

    // Process messages in batches to avoid overwhelming the system
    for (let i = 0; i < messages.length; i += maxConcurrent) {
      const batch = messages.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (message, index) => {
        try {
          const isValid = await this.isValidMessage(message);
          return { message, isValid, index: i + index, error: null };
        } catch (error) {
          return {
            message,
            isValid: false,
            index: i + index,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { message, isValid, error } = result.value;
          if (isValid) {
            validMessages.push(message as unknown as OpchanMessage);
          } else {
            if (!skipInvalid) {
              invalidMessages.push(message);
              if (error) validationErrors.push(error);
            }
          }
        } else {
          if (!skipInvalid) {
            validationErrors.push(
              result.reason?.message || 'Batch validation failed'
            );
          }
        }
      }
    }

    return {
      validMessages,
      invalidMessages,
      totalProcessed: messages.length,
      validationErrors,
    };
  }

  /**
   * Quick validation check without full verification (for performance)
   */
  quickValidate(message: unknown): boolean {
    return this.hasRequiredFields(message);
  }

  /**
   * Get validation statistics
   */
  getValidationStats(report: ValidationReport) {
    const validCount = report.validMessages.length;
    const invalidCount = report.invalidMessages.length;
    const successRate =
      report.totalProcessed > 0 ? validCount / report.totalProcessed : 0;

    return {
      validCount,
      invalidCount,
      totalProcessed: report.totalProcessed,
      successRate,
      errorCount: report.validationErrors.length,
      hasErrors: report.validationErrors.length > 0,
    };
  }

  /**
   * Filter messages by type after validation
   */
  filterByType<T extends OpchanMessage>(
    messages: OpchanMessage[],
    messageType: string
  ): T[] {
    return messages.filter(msg => msg.type === messageType) as T[];
  }

  /**
   * Sort messages by timestamp
   */
  sortByTimestamp(
    messages: OpchanMessage[],
    ascending = true
  ): OpchanMessage[] {
    return [...messages].sort((a, b) =>
      ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    );
  }

  /**
   * Group messages by author
   */
  groupByAuthor(messages: OpchanMessage[]): Record<string, OpchanMessage[]> {
    const grouped: Record<string, OpchanMessage[]> = {};

    for (const message of messages) {
      if (!grouped[message.author]) {
        grouped[message.author] = [];
      }
      const authorMessages = grouped[message.author];
      if (authorMessages) {
        authorMessages.push(message);
      }
    }

    return grouped;
  }

  /**
   * Get validation report for a message (for backward compatibility)
   */
  async getValidationReport(message: unknown): Promise<{
    isValid: boolean;
    hasValidSignature: boolean;
    missingFields: string[];
    invalidFields: string[];
    warnings: string[];
    errors: string[];
  }> {
    const structureReport = this.validateStructure(message);
    let hasValidSignature = false;
    let signatureErrors: string[] = [];
    if (structureReport.isValid) {
      try {
        const result = await this.getDelegationManager().verifyWithReason(
          message as unknown as OpchanMessage
        );
        hasValidSignature = result.isValid;
        signatureErrors = result.reasons;
      } catch (err) {
        hasValidSignature = false;
        signatureErrors = [
          err instanceof Error ? err.message : 'Unknown signature validation error',
        ];
      }
    }

    return {
      ...structureReport,
      hasValidSignature,
      errors: [
        ...structureReport.missingFields,
        ...structureReport.invalidFields,
        ...signatureErrors,
      ],
    };
  }

  /**
   * Validate message structure and return detailed report
   */
  validateStructure(message: unknown): {
    isValid: boolean;
    missingFields: string[];
    invalidFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const invalidFields: string[] = [];
    const warnings: string[] = [];

    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        missingFields: ['message'],
        invalidFields: [],
        warnings: ['Message is not an object'],
      };
    }

    const msg = message as Record<string, unknown>;
    const requiredFields = [
      'signature',
      'browserPubKey',
      'id',
      'type',
      'timestamp',
      'author',
    ];

    for (const field of requiredFields) {
      if (!(field in msg)) {
        missingFields.push(field);
      } else if (
        typeof msg[field] !== (field === 'timestamp' ? 'number' : 'string')
      ) {
        invalidFields.push(field);
      }
    }

    // Additional validation warnings
    if (typeof msg.timestamp === 'number') {
      const age = Date.now() - msg.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        // Older than 24 hours
        warnings.push('Message is older than 24 hours');
      }
      if (msg.timestamp > Date.now() + 5 * 60 * 1000) {
        // More than 5 minutes in future
        warnings.push('Message timestamp is in the future');
      }
    }

    const isValid = missingFields.length === 0 && invalidFields.length === 0;

    return {
      isValid,
      missingFields,
      invalidFields,
      warnings,
    };
  }
}
