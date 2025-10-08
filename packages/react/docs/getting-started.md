## OpChan React SDK (packages/react) — Building Forum UIs

This guide shows how to build a forums-based app using the React SDK. It covers project wiring, wallet connection/disconnection, key delegation, waiting for Waku/network readiness, loading content, posting/commenting, voting, moderation, bookmarks, and user display utilities.

The examples assume you install and use the `@opchan/react` and `@opchan/core` packages.

---

### 1) Install and basic setup

```bash
npm i @opchan/react @opchan/core
```

Create an app-level provider using `OpChanProvider`. You must pass a minimal client config (e.g., Ordiscan API key if you have one). OpChanProvider must be nested inside `WagmiProvider` and `AppKitProvider` from Reown AppKit.

```tsx
import React from 'react';
import { OpChanProvider } from '@opchan/react';
import { WagmiProvider } from 'wagmi';
import { AppKitProvider } from '@reown/appkit/react';
import { appkitConfig, config } from '@opchan/core';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <AppKitProvider {...appkitConfig}>
        <OpChanProvider config={{ ordiscanApiKey: 'YOUR_API_KEY' }}>
          {children}
        </OpChanProvider>
      </AppKitProvider>
    </WagmiProvider>
  );
}
```

OpChanProvider automatically integrates with AppKit for wallet management.

---

### 2) High-level hook

Use `useForum()` for a single entry point to the main hooks:

```tsx
import { useForum } from '@opchan/react';

function Example() {
  const { user, content, permissions, network } = useForum();
  // user: auth + delegation
  // content: cells/posts/comments/bookmarks + actions
  // permissions: derived booleans + reasons
  // network: Waku readiness + refresh
  return null;
}
```

---

### 3) Wallets — connect/disconnect & verification

API: `useAuth()`

```tsx
import { useAuth } from '@opchan/react';

function WalletControls() {
  const { currentUser, verificationStatus, connect, disconnect, verifyOwnership } = useAuth();

  return (
    <div>
      {currentUser ? (
        <>
          <div>Connected: {currentUser.displayName}</div>
          <button onClick={() => disconnect()}>Disconnect</button>
          <button onClick={() => verifyOwnership()}>Verify ENS/Ordinal</button>
          <div>Status: {verificationStatus}</div>
        </>
      ) : (
        <>
          <button onClick={() => connect('bitcoin')}>
            Connect Bitcoin
          </button>
          <button onClick={() => connect('ethereum')}>
            Connect Ethereum
          </button>
        </>
      )}
    </div>
  );
}
```

Notes:
- `connect(walletType)` opens the AppKit modal for the specified wallet type (bitcoin/ethereum). Upon successful connection, OpChan automatically syncs the wallet state and creates a user session.
- `verifyOwnership()` refreshes identity and sets `EVerificationStatus` appropriately (checks ENS or Bitcoin Ordinals).

---

### 4) Key delegation — create, check, clear

API: `useAuth()` → `delegate(duration)`, `delegationStatus()`, `clearDelegation()`; also `delegationInfo` in-session.

```tsx
import { useAuth } from '@opchan/react';

function DelegationControls() {
  const { delegate, delegationInfo, delegationStatus, clearDelegation } = useAuth();

  return (
    <div>
      <div>
        Delegated: {String(delegationInfo.isValid)}
        {delegationInfo.expiresAt && `, expires ${delegationInfo.expiresAt.toLocaleString()}`}
      </div>
      <button onClick={() => delegate('7days')}>Delegate 7 days</button>
      <button onClick={() => delegate('30days')}>Delegate 30 days</button>
      <button onClick={() => delegationStatus().then(console.log)}>Check</button>
      <button onClick={() => clearDelegation()}>Clear</button>
    </div>
  );
}
```

Behavior:
- The library generates a browser keypair and requests a wallet signature authorizing it until a selected expiry.
- All messages (cells/posts/comments/votes/moderation/profile updates) are signed with the delegated browser key and verified via the proof.

---

### 5) Network (Waku) — readiness and manual refresh

API: `useNetwork()`

```tsx
import { useNetwork } from '@opchan/react';

function NetworkStatus() {
  const { isConnected, statusMessage, refresh } = useNetwork();
  return (
    <div>
      <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
      <span> • {statusMessage}</span>
      <button onClick={() => refresh()}>Refresh</button>
    </div>
  );
}
```

Notes:
- The store wires Waku health events to `network.isConnected` and `statusMessage`.
- `refresh()` triggers a lightweight cache refresh; live updates come from the Waku subscription.

---

### 6) Loading content — cells, posts, comments, bookmarks

API: `useContent()`

```tsx
import { useContent } from '@opchan/react';

function Feed() {
  const { cells, posts, comments, postsByCell, commentsByPost, bookmarks, lastSync } = useContent();

  return (
    <div>
      <div>Cells: {cells.length}</div>
      <div>Posts: {posts.length}</div>
      <div>Comments: {comments.length}</div>
      <div>Bookmarks: {bookmarks.length}</div>
      <div>Last sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : '—'}</div>
    </div>
  );
}
```

Derived helpers:
- `postsByCell[cellId]: Post[]`
- `commentsByPost[postId]: Comment[]` (sorted oldest→newest)
- `cellsWithStats`: adds `postCount`, `activeUsers`, `recentActivity` for UI
- `userVerificationStatus[address]`: identity verification snapshot for weighting/relevance
- `pending.isPending(id)`: show optimistic “syncing…” indicators

---

### 7) Creating content — cells, posts, comments

All actions reflect to the local cache immediately and then propagate over the network.

```tsx
import { useContent } from '@opchan/react';

function Composer({ cellId, postId }: { cellId?: string; postId?: string }) {
  const { createCell, createPost, createComment } = useContent();

  const onCreateCell = async () => {
    await createCell({ name: 'My Cell', description: 'Description', icon: '' });
  };

  const onCreatePost = async () => {
    if (!cellId) return;
    await createPost({ cellId, title: 'Hello', content: 'World' });
  };

  const onCreateComment = async () => {
    if (!postId) return;
    await createComment({ postId, content: 'Nice post!' });
  };

  return (
    <div>
      <button onClick={onCreateCell}>Create Cell</button>
      <button onClick={onCreatePost} disabled={!cellId}>Create Post</button>
      <button onClick={onCreateComment} disabled={!postId}>Create Comment</button>
    </div>
  );
}
```

Permissions: see `usePermissions()` below to gate UI.

---

### 8) Voting

```tsx
import { useContent } from '@opchan/react';

function VoteButtons({ targetId }: { targetId: string }) {
  const { vote, pending } = useContent();
  const isSyncing = pending.isPending(targetId);

  return (
    <div>
      <button onClick={() => vote({ targetId, isUpvote: true })}>Upvote</button>
      <button onClick={() => vote({ targetId, isUpvote: false })}>Downvote</button>
      {isSyncing && <span> syncing…</span>}
    </div>
  );
}
```

---

### 9) Moderation (cell owner)

```tsx
import { useContent, usePermissions } from '@opchan/react';

function Moderation({ cellId, postId, commentId, userAddress }: { cellId: string; postId?: string; commentId?: string; userAddress?: string }) {
  const { moderate } = useContent();
  const { canModerate } = usePermissions();

  if (!canModerate(cellId)) return null;

  return (
    <div>
      {postId && (
        <>
          <button onClick={() => moderate.post(cellId, postId, 'reason')}>Moderate post</button>
          <button onClick={() => moderate.unpost(cellId, postId, 'reason')}>Unmoderate post</button>
        </>
      )}
      {commentId && (
        <>
          <button onClick={() => moderate.comment(cellId, commentId, 'reason')}>Moderate comment</button>
          <button onClick={() => moderate.uncomment(cellId, commentId, 'reason')}>Unmoderate comment</button>
        </>
      )}
      {userAddress && (
        <>
          <button onClick={() => moderate.user(cellId, userAddress, 'reason')}>Moderate user</button>
          <button onClick={() => moderate.unuser(cellId, userAddress, 'reason')}>Unmoderate user</button>
        </>
      )}
    </div>
  );
}
```

---

### 10) Bookmarks

```tsx
import { useContent } from '@opchan/react';

function BookmarkControls({ post, comment }: { post?: any; comment?: any }) {
  const { bookmarks, togglePostBookmark, toggleCommentBookmark, removeBookmark, clearAllBookmarks } = useContent();

  return (
    <div>
      <div>Total: {bookmarks.length}</div>
      {post && <button onClick={() => togglePostBookmark(post, post.cellId)}>Toggle post bookmark</button>}
      {comment && <button onClick={() => toggleCommentBookmark(comment, comment.postId)}>Toggle comment bookmark</button>}
      <button onClick={() => bookmarks[0] && removeBookmark(bookmarks[0].id)}>Remove first</button>
      <button onClick={() => clearAllBookmarks()}>Clear all</button>
    </div>
  );
}
```

---

### 11) Permissions helper

API: `usePermissions()` exposes booleans and user-friendly reasons for gating UI.

```tsx
import { usePermissions } from '@opchan/react';

function ActionGates({ cellId }: { cellId: string }) {
  const p = usePermissions();
  return (
    <ul>
      <li>Can create cell: {String(p.canCreateCell)} ({p.reasons.createCell})</li>
      <li>Can post: {String(p.canPost)} ({p.reasons.post})</li>
      <li>Can comment: {String(p.canComment)} ({p.reasons.comment})</li>
      <li>Can vote: {String(p.canVote)} ({p.reasons.vote})</li>
      <li>Can moderate: {String(p.canModerate(cellId))} ({p.reasons.moderate(cellId)})</li>
    </ul>
  );
}
```

---

### 12) User display/identity helpers

API: `useUserDisplay(address)` returns resolved user identity for UI labels.

```tsx
import { useUserDisplay } from '@opchan/react';

function AuthorName({ address }: { address: string }) {
  const { displayName, ensName, ordinalDetails, isLoading } = useUserDisplay(address);
  if (isLoading) return <span>Loading…</span>;
  return <span title={ensName || ordinalDetails?.ordinalId}>{displayName}</span>;
}
```

---

### 13) End-to-end page skeleton

```tsx
import React from 'react';
import { OpChanProvider, useForum } from '@opchan/react';

function Home() {
  const { user, content, permissions, network } = useForum();
  return (
    <div>
      <div>Network: {network.isConnected ? 'Ready' : 'Connecting…'}</div>
      {user.currentUser ? (
        <div>Welcome {user.currentUser.displayName}</div>
      ) : (
        <button onClick={() => user.connect({ address: '0xabc...', walletType: 'ethereum' })}>Connect</button>
      )}
      {permissions.canPost && content.cells[0] && (
        <button onClick={() => content.createPost({ cellId: content.cells[0].id, title: 'Hi', content: 'Hello world' })}>
          New Post
        </button>
      )}
      <ul>
        {content.posts.map(p => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <OpChanProvider config={{ ordiscanApiKey: '' }}>
      <Home />
    </OpChanProvider>
  );
}
```

---

### 14) Notes and best practices

- Always gate actions with `usePermissions()` to provide clear UX reasons.
- Use `pending.isPending(id)` to show optimistic “syncing…” states for content you just created or voted on.
- The store is hydrated from IndexedDB on load; Waku live messages keep it in sync.
- Identity (ENS/Ordinals/Call Sign) is resolved and cached; calling `verifyOwnership()` or updating the profile will refresh it.


