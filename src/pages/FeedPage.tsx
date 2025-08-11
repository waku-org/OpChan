import React, { useMemo, useState } from 'react';
import { RefreshCw, Plus, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PostCard from '@/components/PostCard';
import FeedSidebar from '@/components/FeedSidebar';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/contexts/useAuth';
import { sortPosts, SortOption } from '@/lib/forum/sorting';

const FeedPage: React.FC = () => {
  const { 
    posts, 
    comments, 
    isInitialLoading, 
    isRefreshing, 
    refreshData 
  } = useForum();
  const { verificationStatus } = useAuth();
  const [sortOption, setSortOption] = useState<SortOption>('relevance');

  // Combine posts from all cells and apply sorting
  const allPosts = useMemo(() => {
    const filteredPosts = posts.filter(post => !post.moderated); // Hide moderated posts from main feed
    return sortPosts(filteredPosts, sortOption);
  }, [posts, sortOption]);

  // Calculate comment counts for each post
  const getCommentCount = (postId: string) => {
    return comments.filter(comment => comment.postId === postId && !comment.moderated).length;
  };

  // Loading skeleton
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-cyber-dark">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
                  <div className="flex gap-6">
          {/* Main feed skeleton */}
          <div className="flex-1 max-w-3xl">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-cyber-muted/20 border border-cyber-muted rounded-sm p-4">
                    <div className="flex gap-4">
                      <div className="w-10 space-y-2">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Sidebar skeleton */}
            <div className="w-80 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-cyber-muted/20 border border-cyber-muted rounded-sm p-4">
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
    <div className="min-h-screen bg-cyber-dark">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-glow text-cyber-accent">
              Popular Posts
            </h1>
            <p className="text-cyber-neutral text-sm">
              Latest posts from all cells
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
              <SelectTrigger className="w-40">
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
              onClick={refreshData} 
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Feed */}
          <div className="flex-1 max-w-3xl">
            {/* Posts Feed */}
            <div className="space-y-0">
              {allPosts.length === 0 ? (
                <div className="bg-cyber-muted/20 border border-cyber-muted rounded-sm p-12 text-center">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-glow">
                      No posts yet
                    </h3>
                    <p className="text-cyber-neutral">
                      Be the first to create a post in a cell!
                    </p>
                    {verificationStatus !== 'verified-owner' && (
                      <p className="text-sm text-cyber-neutral/80">
                        Connect your wallet and verify Ordinal ownership to start posting
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                allPosts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    commentCount={getCommentCount(post.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <FeedSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;