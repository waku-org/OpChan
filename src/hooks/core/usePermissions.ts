import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useForumData } from './useForumData';
import { EVerificationStatus } from '@/types/identity';

export interface Permission {
  canPost: boolean;
  canComment: boolean;
  canVote: boolean;
  canCreateCell: boolean;
  canModerate: (cellId: string) => boolean;
  canDelegate: boolean;
  canUpdateProfile: boolean;
}

export interface PermissionReasons {
  voteReason: string;
  postReason: string;
  commentReason: string;
  createCellReason: string;
  moderateReason: (cellId: string) => string;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
}

/**
 * Unified permission system with single source of truth for all permission logic
 */
export function usePermissions(): Permission &
  PermissionReasons & {
    checkPermission: (
      action: keyof Permission,
      cellId?: string
    ) => PermissionResult;
  } {
  const { currentUser, verificationStatus } = useAuth();
  const { cellsWithStats } = useForumData();

  // Single source of truth for all permission logic
  const permissions = useMemo((): Permission => {
    const isWalletConnected =
      verificationStatus === EVerificationStatus.WALLET_CONNECTED;
    const isVerified =
      verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;

    return {
      canPost: isWalletConnected || isVerified,
      canComment: isWalletConnected || isVerified,
      canVote: isWalletConnected || isVerified,
      canCreateCell: isVerified, // Only ENS/Ordinal owners
      canModerate: (cellId: string) => {
        if (!currentUser || !cellId) return false;
        // Check if user is the creator of the cell
        const cell = cellsWithStats.find(c => c.id === cellId);
        return cell ? cell.author === currentUser.address : false;
      },
      canDelegate: isWalletConnected || isVerified,
      canUpdateProfile: Boolean(currentUser),
    };
  }, [currentUser, verificationStatus, cellsWithStats]);

  // Single source of truth for permission reasons
  const reasons = useMemo((): PermissionReasons => {
    if (!currentUser) {
      return {
        voteReason: 'Connect your wallet to vote',
        postReason: 'Connect your wallet to post',
        commentReason: 'Connect your wallet to comment',
        createCellReason: 'Connect your wallet to create cells',
        moderateReason: () => 'Connect your wallet to moderate',
      };
    }

    return {
      voteReason: permissions.canVote
        ? 'You can vote'
        : 'Connect your wallet to vote',
      postReason: permissions.canPost
        ? 'You can post'
        : 'Connect your wallet to post',
      commentReason: permissions.canComment
        ? 'You can comment'
        : 'Connect your wallet to comment',
      createCellReason: permissions.canCreateCell
        ? 'You can create cells'
        : 'Verify ENS or Logos ordinal to create cells',
      moderateReason: (cellId: string) => {
        if (!cellId) return 'Cell ID required';
        return permissions.canModerate(cellId)
          ? 'You can moderate this cell'
          : 'Only cell creators can moderate';
      },
    };
  }, [currentUser, verificationStatus, permissions]);

  // Unified permission checker
  const checkPermission = useMemo(() => {
    return (action: keyof Permission, cellId?: string): PermissionResult => {
      let allowed = false;
      let reason = '';

      switch (action) {
        case 'canVote':
          allowed = permissions.canVote;
          reason = reasons.voteReason;
          break;

        case 'canPost':
          allowed = permissions.canPost;
          reason = reasons.postReason;
          break;

        case 'canComment':
          allowed = permissions.canComment;
          reason = reasons.commentReason;
          break;

        case 'canCreateCell':
          allowed = permissions.canCreateCell;
          reason = reasons.createCellReason;
          break;

        case 'canModerate':
          allowed = cellId ? permissions.canModerate(cellId) : false;
          reason = cellId ? reasons.moderateReason(cellId) : 'Cell ID required';
          break;

        case 'canDelegate':
          allowed = permissions.canDelegate;
          reason = allowed
            ? 'You can delegate keys'
            : 'Connect your wallet to delegate keys';
          break;

        case 'canUpdateProfile':
          allowed = permissions.canUpdateProfile;
          reason = allowed
            ? 'You can update your profile'
            : 'Connect your wallet to update profile';
          break;

        default:
          allowed = false;
          reason = 'Unknown permission';
      }

      return { allowed, reason };
    };
  }, [permissions, reasons]);

  return {
    ...permissions,
    ...reasons,
    checkPermission,
  };
}
