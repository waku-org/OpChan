// Re-export the enhanced auth hook as the main useAuth
export { useEnhancedAuth as useAuth } from './useEnhancedAuth';
export type {
  Permission,
  DetailedVerificationStatus,
  DelegationInfo,
  EnhancedAuthState,
} from './useEnhancedAuth';
