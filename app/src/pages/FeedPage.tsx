import React, { useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PostCard from '@/components/PostCard';
import FeedSidebar from '@/components/FeedSidebar';
import { ModerationToggle } from '@/components/ui/moderation-toggle';
import { useAuth, useContent, useNetwork } from '@/hooks';
import { EVerificationStatus } from '@opchan/core';
import { sortPosts, SortOption } from '@/utils/sorting';
const FeedPage: React.FC = () => {
  const content = useContent();
  const { verificationStatus } = useAuth();
  const { isHydrated } = useNetwork();
  const [sortOption, setSortOption] = useState<SortOption>('relevance');

  const allPosts = useMemo(
    () => sortPosts([...content.posts], sortOption),
    [content.posts, sortOption]
  );

  // Loading skeleton - only show if store is not yet hydrated
  if (
    !isHydrated &&
    !content.posts.length &&
    !content.comments.length &&
    !content.cells.length
  ) {
    return (
      <div className="min-h-screen bg-cyber-dark">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Main feed skeleton */}
            <div className="flex-1 lg:max-w-3xl">
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-cyber-muted/20 border border-cyber-muted rounded-sm p-3 sm:p-4"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div className="w-8 sm:w-10 space-y-2 flex-shrink-0">
                        <Skeleton className="h-5 w-5 sm:h-6 sm:w-6" />
                        <Skeleton className="h-3 w-6 sm:h-4 sm:w-8" />
                        <Skeleton className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-3 sm:h-4 w-2/3" />
                        <Skeleton className="h-5 sm:h-6 w-full" />
                        <Skeleton className="h-3 sm:h-4 w-full" />
                        <Skeleton className="h-3 sm:h-4 w-3/4" />
                        <Skeleton className="h-3 sm:h-4 w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar skeleton - hidden on mobile */}
            <div className="hidden lg:block lg:w-80 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-cyber-muted/20 border border-cyber-muted rounded-sm p-4"
                >
                  <Skeleton className="h-6 w-1/2 mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-main">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="page-title text-primary">
                Popular Posts
              </h1>
              <p className="page-subtitle hidden sm:block">Latest posts from all cells</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2">
              <ModerationToggle />

              <Select
                value={sortOption}
                onValueChange={(value: SortOption) => setSortOption(value)}
              >
                <SelectTrigger className="w-32 sm:w-40 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Relevance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="time">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Newest</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={content.refresh}
                disabled={false}
                className="flex items-center space-x-1 sm:space-x-2 text-[11px]"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Feed */}
          <div className="flex-1 lg:max-w-3xl min-w-0">
            {/* Posts Feed */}
            <div className="space-y-0">
              {allPosts.length === 0 ? (
                <div className="empty-state">
                  <div className="space-y-3">
                    <h3 className="empty-state-title tracking-[0.25em]">
                      No posts yet
                    </h3>
                    <p className="empty-state-description">
                      Be the first to create a post in a cell!
                    </p>
                    {verificationStatus !==
                      EVerificationStatus.ENS_VERIFIED && (
                      <p className="text-xs sm:text-sm text-cyber-neutral/80">
                        Connect your wallet to start posting
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                allPosts.map(post => <PostCard key={post.id} post={post} />)
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <FeedSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
