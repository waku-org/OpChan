import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForumData, useForumSelectors, useAuth } from '@/hooks';
import { EVerificationStatus } from '@/types/identity';
import { CypherImage } from '@/components/ui/CypherImage';
import { useUserDisplay } from '@/hooks';

const FeedSidebar: React.FC = () => {
  // ✅ Use reactive hooks for data
  const forumData = useForumData();
  const selectors = useForumSelectors(forumData);
  const { currentUser, verificationStatus } = useAuth();

  // Get user display information using the hook
  const { displayName, ensName, ordinalDetails } = useUserDisplay(
    currentUser?.address || ''
  );

  // ✅ Get pre-computed stats and trending data from selectors
  const stats = selectors.selectStats();
  // Use cellsWithStats from forumData to get post counts
  const { cellsWithStats } = forumData;
  const trendingCells = cellsWithStats
    .sort((a, b) => b.recentActivity - a.recentActivity)
    .slice(0, 5);

  // User's verification status display
  const getVerificationBadge = () => {
    if (verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED) {
      return { text: 'Verified Owner', color: 'bg-green-500' };
    } else if (verificationStatus === EVerificationStatus.WALLET_CONNECTED) {
      return { text: 'Verified', color: 'bg-blue-500' };
    } else if (ensName) {
      return { text: 'ENS User', color: 'bg-purple-500' };
    } else if (ordinalDetails) {
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
                <div className="font-medium text-sm">{displayName}</div>
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

            {verificationStatus === EVerificationStatus.WALLET_CONNECTED &&
              !ordinalDetails && (
                <div className="text-xs text-muted-foreground">
                  <Eye className="w-3 h-3 inline mr-1" />
                  Read-only mode. Acquire Ordinals to post.
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
