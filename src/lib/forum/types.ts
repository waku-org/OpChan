export interface RelevanceScoreDetails {
    baseScore: number;
    engagementScore: number;
    authorVerificationBonus: number;
    verifiedUpvoteBonus: number;
    verifiedCommenterBonus: number;
    timeDecayMultiplier: number;
    moderationPenalty: number;
    finalScore: number;
    isVerified: boolean;
    upvotes: number;
    comments: number;
    verifiedUpvotes: number;
    verifiedCommenters: number;
    daysOld: number;
    isModerated: boolean;
  }

  export interface UserVerificationStatus {
    [address: string]: {
      isVerified: boolean;
      hasENS: boolean;
      hasOrdinal: boolean;
      ensName?: string;
      verificationStatus?: 'unverified' | 'verified-none' | 'verified-basic' | 'verified-owner' | 'verifying';
    };
  }