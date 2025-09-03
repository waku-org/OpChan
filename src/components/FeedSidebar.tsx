import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/contexts/useAuth';
import { CypherImage } from '@/components/ui/CypherImage';
import { CreateCellDialog } from '@/components/CreateCellDialog';
import { useUserDisplay } from '@/hooks/useUserDisplay';

const FeedSidebar: React.FC = () => {
  const { currentUser, verificationStatus } = useAuth();
  const { cells, posts } = useForum();
  const [showCreateCell, setShowCreateCell] = useState(false);

  // Get user display information using the hook
  const { displayName, hasENS, hasOrdinal } = useUserDisplay(
    currentUser?.address || ''
  );

  // Calculate trending cells based on recent post activity
  const trendingCells = cells
    .map(cell => {
      const cellPosts = posts.filter(post => post.cellId === cell.id);
      const recentPosts = cellPosts.filter(
        post => Date.now() - post.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      );
      const totalScore = cellPosts.reduce(
        (sum, post) => sum + (post.upvotes.length - post.downvotes.length),
        0
      );

      return {
        ...cell,
        postCount: cellPosts.length,
        recentPostCount: recentPosts.length,
        totalScore,
        activity: recentPosts.length + totalScore * 0.1, // Simple activity score
      };
    })
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 5);

  // User's verification status display
  const getVerificationBadge = () => {
    if (!currentUser) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    // Ethereum wallet with ENS
    if (currentUser.walletType === 'ethereum') {
      if (hasENS && (verificationStatus === 'verified-owner' || hasENS)) {
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Owns ENS: {displayName}
          </Badge>
        );
      } else if (verificationStatus === 'verified-basic') {
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ✓ Connected Wallet
          </Badge>
        );
      } else {
        return <Badge variant="outline">Read-only (No ENS detected)</Badge>;
      }
    }

    // Bitcoin wallet with Ordinal
    if (currentUser.walletType === 'bitcoin') {
      if (verificationStatus === 'verified-owner' || hasOrdinal) {
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Owns Ordinal
          </Badge>
        );
      } else if (verificationStatus === 'verified-basic') {
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ✓ Connected Wallet
          </Badge>
        );
      } else {
        return <Badge variant="outline">Read-only (No Ordinal detected)</Badge>;
      }
    }

    // Fallback cases
    switch (verificationStatus) {
      case 'verified-basic':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ✓ Connected Wallet
          </Badge>
        );
      case 'verified-none':
        return <Badge variant="outline">Read Only</Badge>;
      case 'verifying':
        return <Badge variant="outline">Verifying...</Badge>;
      default:
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* User Info Card */}
      {currentUser && (
        <Card className="bg-cyber-muted/20 border-cyber-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cyber-accent">
              Your Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-cyber-neutral">{displayName}</div>
            {getVerificationBadge()}
          </CardContent>
        </Card>
      )}

      {/* Create Cell */}
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardContent className="p-4">
          <Button
            onClick={() => setShowCreateCell(true)}
            className="w-full"
            disabled={verificationStatus !== 'verified-owner'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Cell
          </Button>
          {verificationStatus !== 'verified-owner' && (
            <p className="text-xs text-cyber-neutral mt-2 text-center">
              {currentUser?.walletType === 'ethereum'
                ? 'Own an ENS name to create cells'
                : 'Own a Bitcoin Ordinal to create cells'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trending Cells */}
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center text-cyber-accent">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending Cells
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingCells.length === 0 ? (
            <p className="text-xs text-cyber-neutral">No cells yet</p>
          ) : (
            trendingCells.map((cell, index) => (
              <Link
                key={cell.id}
                to={`/cell/${cell.id}`}
                className="flex items-center space-x-3 p-2 rounded-sm hover:bg-cyber-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-xs font-medium text-cyber-neutral w-4">
                    {index + 1}
                  </span>
                  <CypherImage
                    src={cell.icon}
                    alt={cell.name}
                    className="w-6 h-6 rounded-sm flex-shrink-0"
                    generateUniqueFallback={true}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-glow truncate">
                      r/{cell.name}
                    </div>
                    <div className="text-xs text-cyber-neutral">
                      {cell.postCount} posts
                    </div>
                  </div>
                </div>
                {cell.recentPostCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {cell.recentPostCount} new
                  </Badge>
                )}
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* All Cells */}
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center text-cyber-accent">
            <Users className="w-4 h-4 mr-2" />
            All Cells
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cells.length === 0 ? (
            <p className="text-xs text-cyber-neutral">No cells created yet</p>
          ) : (
            <div className="space-y-1">
              {cells.slice(0, 8).map(cell => (
                <Link
                  key={cell.id}
                  to={`/cell/${cell.id}`}
                  className="block text-sm text-cyber-neutral hover:text-cyber-accent transition-colors"
                >
                  r/{cell.name}
                </Link>
              ))}
              {cells.length > 8 && (
                <Link
                  to="/"
                  className="block text-xs text-cyber-neutral hover:text-cyber-accent transition-colors"
                >
                  View all cells →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-cyber-muted/20 border-cyber-muted">
        <CardContent className="p-4 text-center">
          <div className="text-xs text-cyber-neutral space-y-1">
            <p>OpChan v1.0</p>
            <p>A Decentralized Forum Prototype</p>
            <div className="flex items-center justify-center space-x-1 mt-2">
              <Eye className="w-3 h-3" />
              <span>Powered by Waku</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Cell Dialog */}
      <CreateCellDialog
        open={showCreateCell}
        onOpenChange={setShowCreateCell}
      />
    </div>
  );
};

export default FeedSidebar;
