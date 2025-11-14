import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Eye, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth, useContent } from '@/hooks';
import { EVerificationStatus } from '@opchan/core';
import { CypherImage } from '@/components/ui/CypherImage';

const FeedSidebar: React.FC = () => {
  const { cells, posts, comments, cellsWithStats, userVerificationStatus } =
    useContent();
  const { currentUser, verificationStatus } = useAuth();

  const stats = {
    totalCells: cells.length,
    totalPosts: posts.length,
    totalComments: comments.length,
    totalUsers: new Set([
      ...posts.map(post => post.author),
      ...comments.map(comment => comment.author),
    ]).size,
    verifiedUsers: Object.values(userVerificationStatus).filter(
      status => status.isVerified
    ).length,
  };
  // Use filtered cells with stats for trending cells
  const trendingCells = cellsWithStats
    .sort((a, b) => b.recentActivity - a.recentActivity)
    .slice(0, 5);

  // User's verification status display
  const getVerificationBadge = () => {
    if (verificationStatus === EVerificationStatus.ENS_VERIFIED) {
      return { text: 'Verified Owner', color: 'border-primary text-primary' };
    } else if (verificationStatus === EVerificationStatus.WALLET_CONNECTED) {
      return { text: 'Verified', color: 'border-white/40 text-foreground' };
    } else if (currentUser?.ensDetails) {
      return { text: 'ENS User', color: 'border-purple-400 text-purple-200' };
    } else if (currentUser?.ordinalDetails) {
      return { text: 'Ordinal User', color: 'border-amber-400 text-amber-300' };
    }
    return { text: 'Unverified', color: 'border-border text-muted-foreground' };
  };

  const verificationBadge = getVerificationBadge();

  return (
    <div className="w-80 border-l border-border/60 p-4 space-y-6">
      {/* User Status Card */}
      {currentUser && (
        <Card className="bg-transparent">
          <CardHeader className="pb-0 border-b-0 text-[11px] tracking-[0.2em] text-muted-foreground">
            <CardTitle className="text-xs uppercase tracking-[0.2em]">Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 border border-border/70 flex items-center justify-center text-muted-foreground">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {currentUser?.displayName}
                </div>
                <Badge
                  variant="outline"
                  className={`${verificationBadge.color}`}
                >
                  {verificationBadge.text}
                </Badge>
              </div>
            </div>

            {verificationStatus === EVerificationStatus.WALLET_UNCONNECTED && (
              <div className="text-xs text-muted-foreground">
                <Eye className="w-3 h-3 inline mr-1" />
                Read-only mode. Verify wallet to participate.
              </div>
            )}

            {verificationStatus === EVerificationStatus.WALLET_CONNECTED && (
              <div className="text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Connected. You can post, comment, and vote.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Forum Stats */}
      <Card className="bg-transparent">
        <CardHeader className="pb-0 border-b-0">
          <CardTitle className="text-xs uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            Forum Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-3 gap-4 text-center text-[11px] uppercase tracking-[0.15em]">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-primary">
                {stats.totalCells}
              </div>
              <div className="text-[10px] text-muted-foreground">Cells</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-primary">
                {stats.totalPosts}
              </div>
              <div className="text-[10px] text-muted-foreground">Posts</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-primary">
                {stats.totalComments}
              </div>
              <div className="text-[10px] text-muted-foreground">Comments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending Cells */}
      <Card className="bg-transparent">
        <CardHeader className="pb-0 border-b-0">
          <CardTitle className="text-xs uppercase tracking-[0.2em]">
            Trending Cells
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {trendingCells.map(cell => (
            <Link
              key={cell.id}
              to={`/cell/${cell.id}`}
              className="flex items-center space-x-3 p-2 border border-border/40 hover:border-border transition-colors"
            >
              <CypherImage
                src={cell.icon}
                alt={cell.name}
                className="w-10 h-10 border border-border/60"
                generateUniqueFallback={true}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate text-foreground">
                  {cell.name}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                  {cell.postCount} posts • {cell.activeUsers} members
                </div>
              </div>
            </Link>
          ))}

          {trendingCells.length === 0 && (
            <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-4">
              No active cells yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedSidebar;
