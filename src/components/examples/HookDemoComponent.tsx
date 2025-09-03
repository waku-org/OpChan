import {
  useForumData,
  useAuth,
  useUserDisplay,
  useUserVotes,
  useForumActions,
  useUserActions,
  useAuthActions,
  usePermissions,
  useNetworkStatus,
  useForumSelectors,
} from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Demonstration component showing how to use the new reactive hooks
 * This replaces direct context usage and business logic in components
 */
export function HookDemoComponent() {
  // Core data hooks - reactive and optimized
  const forumData = useForumData();
  const auth = useAuth();
  const userDisplay = useUserDisplay(auth.currentUser?.address || '');

  // Derived hooks for specific data
  const userVotes = useUserVotes();

  // Action hooks with loading states and error handling
  const forumActions = useForumActions();
  const userActions = useUserActions();
  const authActions = useAuthActions();

  // Utility hooks for permissions and status
  const permissions = usePermissions();
  const networkStatus = useNetworkStatus();

  // Selector hooks for data transformation
  const selectors = useForumSelectors(forumData);

  // Example of using selectors
  const trendingPosts = selectors.selectTrendingPosts();
  const stats = selectors.selectStats();

  // Example action handlers (no business logic in component!)
  const handleCreatePost = async () => {
    const result = await forumActions.createPost(
      'example-cell-id',
      'Example Post Title',
      'This is an example post created using the new hook system!'
    );

    if (result) {
      console.log('Post created successfully:', result);
    }
  };

  const handleVotePost = async (postId: string, isUpvote: boolean) => {
    const success = await forumActions.votePost(postId, isUpvote);
    if (success) {
      console.log(`${isUpvote ? 'Upvoted' : 'Downvoted'} post ${postId}`);
    }
  };

  const handleUpdateCallSign = async () => {
    const success = await userActions.updateCallSign('NewCallSign');
    if (success) {
      console.log('Call sign updated successfully');
    }
  };

  const handleDelegateKey = async () => {
    const success = await authActions.delegateKey('7days');
    if (success) {
      console.log('Key delegated successfully');
    }
  };

  if (forumData.isInitialLoading) {
    return <div>Loading forum data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reactive Hook System Demo</h1>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Network Status
            <Badge
              variant={
                networkStatus.getHealthColor() === 'green'
                  ? 'default'
                  : 'destructive'
              }
            >
              {networkStatus.getStatusMessage()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <strong>Waku:</strong> {networkStatus.connections.waku.status}
            </div>
            <div>
              <strong>Wallet:</strong> {networkStatus.connections.wallet.status}
            </div>
            <div>
              <strong>Delegation:</strong>{' '}
              {networkStatus.connections.delegation.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <strong>User:</strong> {auth.getDisplayName()}
            {auth.getVerificationBadge() && (
              <Badge>{auth.getVerificationBadge()}</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Verification Level:</strong>{' '}
              {auth.verificationStatus.level}
            </div>
            <div>
              <strong>Delegation Active:</strong>{' '}
              {auth.delegationInfo.isActive ? 'Yes' : 'No'}
            </div>
          </div>

          {userDisplay.badges.length > 0 && (
            <div className="flex gap-2">
              <strong>Badges:</strong>
              {userDisplay.badges.map((badge, index) => (
                <Badge key={index} className={badge.color}>
                  {badge.icon} {badge.label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleDelegateKey}
              disabled={authActions.isDelegating || !permissions.canDelegate}
            >
              {authActions.isDelegating ? 'Delegating...' : 'Delegate Key'}
            </Button>
            <Button
              onClick={handleUpdateCallSign}
              disabled={userActions.isUpdatingCallSign}
            >
              {userActions.isUpdatingCallSign
                ? 'Updating...'
                : 'Update Call Sign'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Can Vote:</span>
                <Badge variant={permissions.canVote ? 'default' : 'secondary'}>
                  {permissions.canVote ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Can Post:</span>
                <Badge variant={permissions.canPost ? 'default' : 'secondary'}>
                  {permissions.canPost ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Can Comment:</span>
                <Badge
                  variant={permissions.canComment ? 'default' : 'secondary'}
                >
                  {permissions.canComment ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <strong>Vote Reason:</strong> {permissions.voteReason}
              </div>
              <div>
                <strong>Post Reason:</strong> {permissions.postReason}
              </div>
              <div>
                <strong>Comment Reason:</strong> {permissions.commentReason}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forum Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Forum Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalCells}</div>
              <div className="text-sm text-muted-foreground">Cells</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalPosts}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalComments}</div>
              <div className="text-sm text-muted-foreground">Comments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
              <div className="text-sm text-muted-foreground">
                Verified Users
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Trending Posts (via Selectors)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendingPosts.slice(0, 3).map(post => (
            <div key={post.id} className="mb-4 p-3 border rounded">
              <h3 className="font-semibold">{post.title}</h3>
              <p className="text-sm text-muted-foreground">
                Score: {post.upvotes.length - post.downvotes.length} | Author:{' '}
                {post.author.slice(0, 8)}... | Cell:{' '}
                {forumData.cells.find(c => c.id === post.cellId)?.name ||
                  'Unknown'}
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVotePost(post.id, true)}
                  disabled={forumActions.isVoting || !permissions.canVote}
                >
                  ↑ {post.upvotes.length}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVotePost(post.id, false)}
                  disabled={forumActions.isVoting || !permissions.canVote}
                >
                  ↓ {post.downvotes.length}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Voting History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Voting Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{userVotes.totalVotes}</div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {Math.round(userVotes.upvoteRatio * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Upvote Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {userVotes.votedPosts.size}
              </div>
              <div className="text-sm text-muted-foreground">Posts Voted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action States */}
      <Card>
        <CardHeader>
          <CardTitle>Action States</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Creating Post:</span>
              <Badge
                variant={forumActions.isCreatingPost ? 'default' : 'secondary'}
              >
                {forumActions.isCreatingPost ? 'Active' : 'Idle'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Voting:</span>
              <Badge variant={forumActions.isVoting ? 'default' : 'secondary'}>
                {forumActions.isVoting ? 'Active' : 'Idle'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Updating Profile:</span>
              <Badge
                variant={
                  userActions.isUpdatingProfile ? 'default' : 'secondary'
                }
              >
                {userActions.isUpdatingProfile ? 'Active' : 'Idle'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Example Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={handleCreatePost}
              disabled={forumActions.isCreatingPost || !permissions.canPost}
            >
              {forumActions.isCreatingPost
                ? 'Creating...'
                : 'Create Example Post'}
            </Button>
            <Button
              onClick={forumActions.refreshData}
              disabled={forumActions.isVoting}
            >
              Refresh Forum Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Key Benefits Demonstrated:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            ✅ Zero business logic in this component - all handled by hooks
          </li>
          <li>
            ✅ Reactive updates - data changes automatically trigger re-renders
          </li>
          <li>✅ Centralized permissions - consistent across all components</li>
          <li>✅ Optimized selectors - expensive computations are memoized</li>
          <li>✅ Loading states and error handling built into actions</li>
          <li>✅ Type-safe interfaces for all hook returns</li>
        </ul>
      </div>
    </div>
  );
}
