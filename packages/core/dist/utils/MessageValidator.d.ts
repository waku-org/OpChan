import { OpchanMessage } from '../types/forum';
import { DelegationManager } from '../delegation';
interface ValidationReport {
    validMessages: OpchanMessage[];
    invalidMessages: unknown[];
    totalProcessed: number;
    validationErrors: string[];
}
export declare class MessageValidator {
    private delegationManager?;
    constructor(delegationManager?: DelegationManager);
    private getDelegationManager;
    /**
     * Validates that a message has required signature fields and valid signature
     */
    isValidMessage(message: unknown): Promise<boolean>;
    /**
     * Checks if message has required signature and browserPubKey fields
     */
    private hasRequiredFields;
    /**
     * Validates multiple messages and returns validation report
     */
    validateMessages(messages: unknown[]): Promise<ValidationReport>;
    /**
     * Validates and returns a single message if valid
     */
    validateSingleMessage(message: unknown): Promise<OpchanMessage>;
    /**
     * Batch validation with performance optimization
     */
    batchValidate(messages: unknown[], options?: {
        maxConcurrent?: number;
        skipInvalid?: boolean;
    }): Promise<ValidationReport>;
    /**
     * Quick validation check without full verification (for performance)
     */
    quickValidate(message: unknown): boolean;
    /**
     * Get validation statistics
     */
    getValidationStats(report: ValidationReport): {
        validCount: number;
        invalidCount: number;
        totalProcessed: number;
        successRate: number;
        errorCount: number;
        hasErrors: boolean;
    };
    /**
     * Filter messages by type after validation
     */
    filterByType<T extends OpchanMessage>(messages: OpchanMessage[], messageType: string): T[];
    /**
     * Sort messages by timestamp
     */
    sortByTimestamp(messages: OpchanMessage[], ascending?: boolean): OpchanMessage[];
    /**
     * Group messages by author
     */
    groupByAuthor(messages: OpchanMessage[]): Record<string, OpchanMessage[]>;
    /**
     * Get validation report for a message (for backward compatibility)
     */
    getValidationReport(message: unknown): Promise<{
        isValid: boolean;
        hasValidSignature: boolean;
        missingFields: string[];
        invalidFields: string[];
        warnings: string[];
        errors: string[];
    }>;
    /**
     * Validate message structure and return detailed report
     */
    validateStructure(message: unknown): {
        isValid: boolean;
        missingFields: string[];
        invalidFields: string[];
        warnings: string[];
    };
}
export {};
//# sourceMappingURL=MessageValidator.d.ts.map