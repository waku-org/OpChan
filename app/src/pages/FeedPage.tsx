import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PostCard from '@/components/PostCard';
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

  // Simple loading text
  if (
    !isHydrated &&
    !content.posts.length &&
    !content.comments.length &&
    !content.cells.length
  ) {
    return (
      <div className="min-h-screen bg-cyber-dark">
        <div className="container mx-auto px-2 py-4 max-w-4xl">
          <div className="text-xs text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="w-full mx-auto px-2 py-2 max-w-4xl">
        {/* Minimal Header */}
        <div className="mb-2 pb-1 border-b border-border/30 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">FEED</span>
            <ModerationToggle />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={sortOption}
              onValueChange={(value: SortOption) => setSortOption(value)}
            >
              <SelectTrigger className="w-24 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="time">Newest</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={content.refresh}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              refresh
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div>
          {allPosts.length === 0 ? (
            <div className="py-4 text-xs text-muted-foreground text-center">
              No posts yet. Connect wallet to post.
            </div>
          ) : (
            allPosts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
