import { useMemo } from 'react';
import { useAuth } from '@/hooks/core/useEnhancedAuth';
import { useForumData } from '@/hooks/core/useForumData';

export interface PermissionCheck {
  canVote: boolean;
  canPost: boolean;
  canComment: boolean;
  canCreateCell: boolean;
  canModerate: (cellId: string) => boolean;
  canModeratePosts: (cellId: string) => boolean;
  canModerateComments: (cellId: string) => boolean;
  canModerateUsers: (cellId: string) => boolean;
  canUpdateProfile: boolean;
  canDelegate: boolean;
}

export interface DetailedPermissions extends PermissionCheck {
  // Permission reasons (why user can/cannot do something)
  voteReason: string;
  postReason: string;
  commentReason: string;
  createCellReason: string;
  moderateReason: (cellId: string) => string;

  // Helper methods
  checkPermission: (
    action: keyof PermissionCheck,
    cellId?: string
  ) => {
    allowed: boolean;
    reason: string;
  };

  // Verification requirements
  requiresVerification: (action: keyof PermissionCheck) => boolean;
  requiresOrdinal: (action: keyof PermissionCheck) => boolean;
  requiresENS: (action: keyof PermissionCheck) => boolean;
}

/**
 * Hook for checking user permissions with detailed reasons
 */
export function usePermissions(): DetailedPermissions {
  const { currentUser, verificationStatus, permissions } = useAuth();
  const { cellsWithStats } = useForumData();

  const permissionReasons = useMemo(() => {
    if (!currentUser) {
      return {
        voteReason: 'Connect your wallet to vote',
        postReason: 'Connect your wallet to post',
        commentReason: 'Connect your wallet to comment',
        createCellReason: 'Connect your wallet to create cells',
      };
    }

    const hasOrdinal = verificationStatus.hasOrdinal;
    const hasENS = verificationStatus.hasENS;
    const isVerified = verificationStatus.level !== 'unverified';

    return {
      voteReason: permissions.canVote
        ? 'You can vote'
        : !isVerified
          ? 'Verify your wallet to vote'
          : !hasOrdinal && !hasENS
            ? 'Acquire an Ordinal or ENS domain to vote'
            : 'Voting not available',

      postReason: permissions.canPost
        ? 'You can post'
        : !hasOrdinal
          ? 'Acquire an Ordinal to post'
          : verificationStatus.level !== 'verified-owner'
            ? 'Verify Ordinal ownership to post'
            : 'Posting not available',

      commentReason: permissions.canComment
        ? 'You can comment'
        : !hasOrdinal
          ? 'Acquire an Ordinal to comment'
          : verificationStatus.level !== 'verified-owner'
            ? 'Verify Ordinal ownership to comment'
            : 'Commenting not available',

      createCellReason: permissions.canCreateCell
        ? 'You can create cells'
        : !hasOrdinal
          ? 'Acquire an Ordinal to create cells'
          : verificationStatus.level !== 'verified-owner'
            ? 'Verify Ordinal ownership to create cells'
            : 'Cell creation not available',
    };
  }, [currentUser, verificationStatus, permissions]);

  const canModerate = useMemo(() => {
    return (cellId: string): boolean => {
      if (!currentUser || !cellId) return false;

      const cell = cellsWithStats.find(c => c.id === cellId);
      return cell ? currentUser.address === cell.signature : false;
    };
  }, [currentUser, cellsWithStats]);

  const moderateReason = useMemo(() => {
    return (cellId: string): string => {
      if (!currentUser) return 'Connect your wallet to moderate';
      if (!cellId) return 'Invalid cell';

      const cell = cellsWithStats.find(c => c.id === cellId);
      if (!cell) return 'Cell not found';

      return currentUser.address === cell.signature
        ? 'You can moderate this cell'
        : 'Only cell owners can moderate';
    };
  }, [currentUser, cellsWithStats]);

  const checkPermission = useMemo(() => {
    return (action: keyof PermissionCheck, cellId?: string) => {
      let allowed = false;
      let reason = '';

      switch (action) {
        case 'canVote':
          allowed = permissions.canVote;
          reason = permissionReasons.voteReason;
          break;

        case 'canPost':
          allowed = permissions.canPost;
          reason = permissionReasons.postReason;
          break;

        case 'canComment':
          allowed = permissions.canComment;
          reason = permissionReasons.commentReason;
          break;

        case 'canCreateCell':
          allowed = permissions.canCreateCell;
          reason = permissionReasons.createCellReason;
          break;

        case 'canModerate':
        case 'canModeratePosts':
        case 'canModerateComments':
        case 'canModerateUsers':
          allowed = cellId ? canModerate(cellId) : false;
          reason = cellId ? moderateReason(cellId) : 'Cell ID required';
          break;

        case 'canUpdateProfile':
          allowed = permissions.canUpdateProfile;
          reason = allowed
            ? 'You can update your profile'
            : 'Connect your wallet to update profile';
          break;

        case 'canDelegate':
          allowed = permissions.canDelegate;
          reason = allowed
            ? 'You can delegate keys'
            : 'Verify your wallet to delegate keys';
          break;

        default:
          allowed = false;
          reason = 'Unknown permission';
      }

      return { allowed, reason };
    };
  }, [permissions, permissionReasons, canModerate, moderateReason]);

  const requiresVerification = useMemo(() => {
    return (action: keyof PermissionCheck): boolean => {
      switch (action) {
        case 'canVote':
        case 'canDelegate':
          return true;
        case 'canPost':
        case 'canComment':
        case 'canCreateCell':
        case 'canModerate':
        case 'canModeratePosts':
        case 'canModerateComments':
        case 'canModerateUsers':
          return true;
        case 'canUpdateProfile':
          return false;
        default:
          return false;
      }
    };
  }, []);

  const requiresOrdinal = useMemo(() => {
    return (action: keyof PermissionCheck): boolean => {
      switch (action) {
        case 'canPost':
        case 'canComment':
        case 'canCreateCell':
        case 'canModerate':
        case 'canModeratePosts':
        case 'canModerateComments':
        case 'canModerateUsers':
          return true;
        default:
          return false;
      }
    };
  }, []);

  const requiresENS = useMemo(() => {
    return (action: keyof PermissionCheck): boolean => {
      // ENS can substitute for some Ordinal requirements for voting
      switch (action) {
        case 'canVote':
          return !verificationStatus.hasOrdinal; // ENS can substitute for voting if no Ordinal
        default:
          return false;
      }
    };
  }, [verificationStatus.hasOrdinal]);

  return {
    // Basic permissions
    canVote: permissions.canVote,
    canPost: permissions.canPost,
    canComment: permissions.canComment,
    canCreateCell: permissions.canCreateCell,
    canModerate,
    canModeratePosts: canModerate,
    canModerateComments: canModerate,
    canModerateUsers: canModerate,
    canUpdateProfile: permissions.canUpdateProfile,
    canDelegate: permissions.canDelegate,

    // Reasons
    voteReason: permissionReasons.voteReason,
    postReason: permissionReasons.postReason,
    commentReason: permissionReasons.commentReason,
    createCellReason: permissionReasons.createCellReason,
    moderateReason,

    // Helper methods
    checkPermission,
    requiresVerification,
    requiresOrdinal,
    requiresENS,
  };
}
