import { useState, useEffect, useCallback } from 'react';
import { Cell, Post, Comment, OpchanMessage } from '@/types/forum';
import { UserVerificationStatus } from '@/types/forum';
import { User } from '@/types/identity';
import messageManager from '@/lib/waku';
import { getDataFromCache } from '@/lib/forum/transformers';
import { RelevanceCalculator } from '@/lib/forum/RelevanceCalculator';
import { DelegationManager } from '@/lib/delegation';
import { UserIdentityService } from '@/lib/services/UserIdentityService';

interface UseCacheOptions {
  delegationManager: DelegationManager;
  userIdentityService: UserIdentityService;
  currentUser: User | null;
  isAuthenticated: boolean;
}

interface CacheData {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  userVerificationStatus: UserVerificationStatus;
}

export function useCache({
  delegationManager,
  userIdentityService,
  currentUser,
  isAuthenticated,
}: UseCacheOptions): CacheData {
  const [cacheData, setCacheData] = useState<CacheData>({
    cells: [],
    posts: [],
    comments: [],
    userVerificationStatus: {},
  });

  // Function to update cache data
  const updateCacheData = useCallback(async () => {
    try {
      // Use the verifyMessage function from delegationManager if available
      const verifyFn = isAuthenticated
        ? async (message: OpchanMessage) =>
            await delegationManager.verify(message)
        : undefined;

      // Build user verification status for relevance calculation
      const relevanceCalculator = new RelevanceCalculator();
      const allUsers: User[] = [];

      // Collect all unique users from posts, comments, and votes
      const userAddresses = new Set<string>();

      // Add users from posts
      Object.values(messageManager.messageCache.posts).forEach(post => {
        userAddresses.add(post.author);
      });

      // Add users from comments
      Object.values(messageManager.messageCache.comments).forEach(comment => {
        userAddresses.add(comment.author);
      });

      // Add users from votes
      Object.values(messageManager.messageCache.votes).forEach(vote => {
        userAddresses.add(vote.author);
      });

      // Create user objects for verification status using existing hooks
      const userPromises = Array.from(userAddresses).map(async address => {
        // Check if this address matches the current user's address
        if (currentUser && currentUser.address === address) {
          // Use the current user's actual verification status
          return currentUser;
        } else {
          // Use UserIdentityService to get identity information (simplified)
          const identity = await userIdentityService.getUserIdentity(address);
          if (identity) {
            return {
              address,
              walletType: (address.startsWith('0x') ? 'ethereum' : 'bitcoin') as 'bitcoin' | 'ethereum',
              verificationStatus: identity.verificationStatus || 'unverified',
              displayPreference: identity.displayPreference || 'wallet-address',
              ensDetails: identity.ensName ? { ensName: identity.ensName } : undefined,
              ordinalDetails: identity.ordinalDetails,
              lastChecked: identity.lastUpdated,
            } as User;
          } else {
            // Fallback to generic user object
            return {
              address,
              walletType: (address.startsWith('0x') ? 'ethereum' : 'bitcoin') as 'bitcoin' | 'ethereum',
              verificationStatus: 'unverified' as const,
              displayPreference: 'wallet-address' as const,
            } as User;
          }
        }
      });

      const resolvedUsers = await Promise.all(userPromises);
      allUsers.push(...resolvedUsers);

      const initialStatus =
        relevanceCalculator.buildUserVerificationStatus(allUsers);

      // Transform data with relevance calculation
      const { cells, posts, comments } = await getDataFromCache(
        verifyFn,
        initialStatus
      );

      setCacheData({
        cells,
        posts,
        comments,
        userVerificationStatus: initialStatus,
      });
    } catch (error) {
      console.error('Error updating cache data:', error);
    }
  }, [delegationManager, isAuthenticated, currentUser, userIdentityService]);

  // Update cache data when dependencies change
  useEffect(() => {
    updateCacheData();
  }, [updateCacheData]);

  // Check for cache changes periodically (much less frequent than before)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only check if we're connected to avoid unnecessary work
      if (messageManager.isReady) {
        updateCacheData();
      }
    }, 10000); // 10 seconds instead of 5

    return () => clearInterval(interval);
  }, [updateCacheData]);

  return cacheData;
}
