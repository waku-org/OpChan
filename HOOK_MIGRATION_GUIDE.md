# Hook Migration Guide

## Overview

This guide explains how to migrate your existing components from direct context usage to the new reactive hook system. The new hooks eliminate business logic from components and provide better performance through selective re-renders.

## Migration Strategy

### Phase 1: Install New Hooks (✅ Complete)

- Core data hooks: `useForumData`, `useAuth`, `useUserDisplay`
- Derived hooks: `useCell`, `usePost`, `useCellPosts`, `usePostComments`, `useUserVotes`
- Action hooks: `useForumActions`, `useUserActions`, `useAuthActions`
- Utility hooks: `usePermissions`, `useNetworkStatus`, `useForumSelectors`

### Phase 2: Component Migration (Next Steps)

## Before and After Examples

### PostCard Component Migration

#### ❌ Before (Business Logic in Component)

```tsx
const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { getCellById, votePost, isVoting } = useForum();
  const { isAuthenticated, currentUser } = useAuth();

  const cell = getCellById(post.cellId);

  // ❌ Business logic in component
  const score = post.upvotes.length - post.downvotes.length;
  const userUpvoted = currentUser
    ? post.upvotes.some(vote => vote.author === currentUser.address)
    : false;
  const userDownvoted = currentUser
    ? post.downvotes.some(vote => vote.author === currentUser.address)
    : false;

  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    await votePost(post.id, isUpvote);
  };

  return (
    // JSX with manual calculations
  );
};
```

#### ✅ After (Pure Presentation)

```tsx
const PostCard: React.FC<PostCardProps> = ({ post }) => {
  // ✅ All data comes pre-computed from hooks
  const { forumActions } = useForumActions();
  const permissions = usePermissions();
  const userVotes = useUserVotes();

  // ✅ No business logic - just pure data access
  const userVoteType = userVotes.getPostVoteType(post.id);
  const canVote = permissions.canVote;

  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault();
    // ✅ All validation and logic handled in hook
    await forumActions.votePost(post.id, isUpvote);
  };

  return (
    // ✅ JSX uses pre-computed data
    <div>
      <span>{post.voteScore}</span> {/* Already computed */}
      <button
        disabled={!canVote || forumActions.isVoting}
        className={userVoteType === 'upvote' ? 'active' : ''}
      >
        Upvote
      </button>
    </div>
  );
};
```

### PostDetail Component Migration

#### ❌ Before

```tsx
const PostDetail = () => {
  const { posts, getCommentsByPost, votePost, voteComment } = useForum();
  const { currentUser, verificationStatus } = useAuth();

  // ❌ Manual data fetching and filtering
  const post = posts.find(p => p.id === postId);
  const postComments = getCommentsByPost(post.id);
  const visibleComments = postComments.filter(comment => !comment.moderated);

  // ❌ Permission checking in component
  const canVote =
    verificationStatus === 'verified-owner' ||
    currentUser?.ensDetails ||
    currentUser?.ordinalDetails;

  // ❌ Vote status checking
  const isPostUpvoted =
    currentUser &&
    post.upvotes.some(vote => vote.author === currentUser.address);
};
```

#### ✅ After

```tsx
const PostDetail = () => {
  // ✅ Get pre-computed post data
  const post = usePost(postId);
  const comments = usePostComments(postId, { includeModerated: false });
  const permissions = usePermissions();
  const forumActions = useForumActions();

  if (!post) return <div>Post not found</div>;

  return (
    <div>
      <h1>{post.title}</h1>
      <p>Score: {post.voteScore}</p> {/* Pre-computed */}
      <button
        disabled={!permissions.canVote}
        className={post.userUpvoted ? 'active' : ''}
        onClick={() => forumActions.votePost(post.id, true)}
      >
        Upvote ({post.upvotes.length})
      </button>
      {comments.comments.map(comment => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
    </div>
  );
};
```

## Migration Checklist

### For Each Component:

1. **Identify Current Context Usage**
   - [ ] Replace `useForum()` with specific hooks
   - [ ] Replace `useAuth()` with enhanced `useAuth()`
   - [ ] Replace `useUserDisplay()` with enhanced version

2. **Extract Business Logic**
   - [ ] Remove vote calculations → use `post.voteScore`, `post.userUpvoted`
   - [ ] Remove permission checks → use `usePermissions()`
   - [ ] Remove data filtering → use hook options
   - [ ] Remove user display logic → use `useUserDisplay()`

3. **Use Appropriate Hooks**
   - [ ] Single items: `useCell()`, `usePost()`
   - [ ] Collections: `useCellPosts()`, `usePostComments()`
   - [ ] Actions: `useForumActions()`, `useUserActions()`
   - [ ] Utilities: `usePermissions()`, `useNetworkStatus()`

4. **Update Action Handlers**
   - [ ] Replace direct context methods with hook actions
   - [ ] Remove manual loading states (hooks provide them)
   - [ ] Remove manual error handling (hooks handle it)

## Common Patterns

### Data Access

```tsx
// ❌ Before
const { posts, getCellById } = useForum();
const cellPosts = posts.filter(p => p.cellId === cellId);
const cell = getCellById(cellId);

// ✅ After
const cell = useCell(cellId);
const cellPosts = useCellPosts(cellId, { sortBy: 'relevance' });
```

### Permission Checking

```tsx
// ❌ Before
const canVote =
  verificationStatus === 'verified-owner' && currentUser?.ordinalDetails;

// ✅ After
const { canVote, voteReason } = usePermissions();
```

### Vote Status

```tsx
// ❌ Before
const userUpvoted =
  currentUser && post.upvotes.some(vote => vote.author === currentUser.address);

// ✅ After
const userVotes = useUserVotes();
const userUpvoted = userVotes.getPostVoteType(post.id) === 'upvote';
```

### Actions with Loading States

```tsx
// ❌ Before
const { votePost, isVoting } = useForum();

// ✅ After
const { votePost, isVoting } = useForumActions();
```

## Benefits After Migration

### Performance

- ✅ Selective re-renders (only affected components update)
- ✅ Memoized computations (vote scores, user status, etc.)
- ✅ Efficient data access patterns

### Developer Experience

- ✅ Type-safe hook interfaces
- ✅ Built-in loading states and error handling
- ✅ Consistent permission checking
- ✅ No business logic in components

### Maintainability

- ✅ Centralized business logic in hooks
- ✅ Reusable data transformations
- ✅ Easier testing (hooks can be tested independently)
- ✅ Clear separation of concerns

## Testing Strategy

### Hook Testing

```tsx
// Test hooks independently
import { renderHook } from '@testing-library/react';
import { useForumData } from '@/hooks';

test('useForumData returns computed vote scores', () => {
  const { result } = renderHook(() => useForumData());
  expect(result.current.postsWithVoteStatus[0].voteScore).toBeDefined();
});
```

### Component Testing

```tsx
// Components become easier to test (pure presentation)
import { render } from '@testing-library/react';
import PostCard from './PostCard';

test('PostCard displays vote score', () => {
  const mockPost = { id: '1', voteScore: 5, userUpvoted: true };
  render(<PostCard post={mockPost} />);
  expect(screen.getByText('5')).toBeInTheDocument();
});
```

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Import legacy hooks

   ```tsx
   import { useForum as useLegacyForum } from '@/contexts/useForum';
   ```

2. **Gradual Migration**: Use both systems temporarily

   ```tsx
   const legacyData = useLegacyForum();
   const newData = useForumData();
   const data = newData.isInitialLoading ? legacyData : newData;
   ```

3. **Component-by-Component**: Migrate one component at a time

## Next Steps

1. **Start with Simple Components**: Begin with components that have minimal business logic
2. **Test Thoroughly**: Ensure reactive updates work correctly
3. **Monitor Performance**: Verify improved render performance
4. **Update Documentation**: Keep component documentation current
5. **Remove Legacy Code**: After full migration, remove old context dependencies

## Example Migration Order

1. ✅ **PostCard** - Simple display component
2. ✅ **CommentCard** - Similar patterns to PostCard
3. **CellList** - Collection display
4. **PostDetail** - Complex component with multiple data sources
5. **PostList** - Full CRUD operations
6. **Header** - Authentication and user display
7. **ActivityFeed** - Complex data aggregation

This migration will transform your codebase into a clean, reactive system where components are purely presentational and all business logic is centralized in reusable hooks.
