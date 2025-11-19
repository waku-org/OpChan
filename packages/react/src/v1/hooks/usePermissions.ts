import { useOpchanStore } from '../store/opchanStore';
import { EVerificationStatus } from '@opchan/core';

export function usePermissions() {
  const { session, content } = useOpchanStore(s => ({ session: s.session, content: s.content }));
  const currentUser = session.currentUser;

  const isVerified = session.verificationStatus === EVerificationStatus.ENS_VERIFIED;
  const isConnected = session.verificationStatus !== EVerificationStatus.WALLET_UNCONNECTED &&
                      session.verificationStatus !== EVerificationStatus.ANONYMOUS;
  const isAnonymous = session.verificationStatus === EVerificationStatus.ANONYMOUS;

  const canCreateCell = isVerified;
  const canPost = isConnected || isAnonymous;
  const canComment = isConnected || isAnonymous;
  const canVote = isConnected;

  const canModerate = (cellId: string): boolean => {
    if (!currentUser) return false;
    const cell = content.cells.find(c => c.id === cellId);
    return cell ? cell.author === currentUser.address : false;
  };

  const reasons = {
    post: canPost ? '' : 'Connect your wallet or use anonymous mode to post',
    comment: canComment ? '' : 'Connect your wallet or use anonymous mode to comment',
    vote: canVote ? '' : 'Connect your wallet to vote',
    createCell: canCreateCell ? '' : 'Verification required to create a cell',
    moderate: (cellId: string) => (canModerate(cellId) ? '' : 'Only cell owner can moderate'),
  } as const;

  const check = (
    action:
      | 'canPost'
      | 'canComment'
      | 'canVote'
      | 'canCreateCell'
      | 'canModerate',
    cellId?: string
  ): { allowed: boolean; reason: string } => {
    switch (action) {
      case 'canPost':
        return { allowed: canPost, reason: reasons.post };
      case 'canComment':
        return { allowed: canComment, reason: reasons.comment };
      case 'canVote':
        return { allowed: canVote, reason: reasons.vote };
      case 'canCreateCell':
        return { allowed: canCreateCell, reason: reasons.createCell };
      case 'canModerate':
        return { allowed: cellId ? canModerate(cellId) : false, reason: cellId ? reasons.moderate(cellId) : 'Cell required' };
      default:
        return { allowed: false, reason: 'Unknown action' };
    }
  };

  return {
    canPost,
    canComment,
    canVote,
    canCreateCell,
    canDelegate: isVerified || isConnected,
    canModerate,
    reasons,
    check,
  } as const;
}




