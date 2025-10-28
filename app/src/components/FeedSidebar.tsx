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
      return { text: 'Verified Owner', color: 'bg-green-500' };
    } else if (verificationStatus === EVerificationStatus.WALLET_CONNECTED) {
      return { text: 'Verified', color: 'bg-blue-500' };
    } else if (currentUser?.ensDetails) {
      return { text: 'ENS User', color: 'bg-purple-500' };
    } else if (currentUser?.ordinalDetails) {
      return { text: 'Ordinal User', color: 'bg-orange-500' };
    }
    return { text: 'Unverified', color: 'bg-gray-500' };
  };

  const verificationBadge = getVerificationBadge();

  return (
    <div className="w-80 bg-cyber-muted/10 border-l border-cyber-muted p-4 space-y-6 overflow-y-auto">
      {/* User Status Card */}
      {currentUser && (
        <Card className="bg-cyber-muted/20 border-cyber-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-cyber-accent/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyber-accent" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {currentUser?.displayName}
                </div>
                <Badge
                  variant="secondary"
                  className={`${verificationBadge.color} text-white text-xs`}
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
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Forum Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-cyber-accent">
                {stats.totalCells}
              </div>
              <div className="text-xs text-muted-foreground">Cells</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyber-accent">
                {stats.totalPosts}
              </div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyber-accent">
                {stats.totalComments}
              </div>
              <div className="text-xs text-muted-foreground">Comments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending Cells */}
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Trending Cells</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingCells.map(cell => (
            <Link
              key={cell.id}
              to={`/cell/${cell.id}`}
              className="flex items-center space-x-3 p-2 rounded-sm hover:bg-cyber-muted/30 transition-colors"
            >
              <CypherImage
                src={cell.icon}
                alt={cell.name}
                className="w-8 h-8 rounded-sm"
                generateUniqueFallback={true}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{cell.name}</div>
                <div className="text-xs text-muted-foreground">
                  {cell.postCount} posts • {cell.activeUsers} members
                </div>
              </div>
            </Link>
          ))}

          {trendingCells.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">
              No active cells yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedSidebar;
