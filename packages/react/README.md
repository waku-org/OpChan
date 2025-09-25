## @opchan/react

Lightweight React provider and hooks for building OpChan clients on top of `@opchan/core`.

### Install

```bash
npm i @opchan/react @opchan/core react react-dom
```

### Quickstart

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OpChanProvider } from '@opchan/react';

const config = {
  // See @opchan/core for full options
  waku: { bootstrapPeers: [], pubsubTopic: 'opchan-v1' },
  database: { name: 'opchan' },
};

// Optional: bridge your wallet to OpChan
const walletAdapter = {
  getAccount() {
    // Return { address, walletType: 'bitcoin' | 'ethereum' } or null
    return null;
  },
  onChange(cb) {
    // Subscribe to wallet changes; return an unsubscribe function
    return () => {};
  },
};

function App() {
  return (
    <OpChanProvider config={config} walletAdapter={walletAdapter}>
      {/* your app */}
    </OpChanProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
```

### Common usage

```tsx
import { useForum } from '@opchan/react';

export function NewPostButton({ cellId }: { cellId: string }) {
  const { user, content, permissions } = useForum();

  const onCreate = async () => {
    if (!permissions.canPost) return;
    await content.createPost({ cellId, title: 'Hello', content: 'World' });
  };

  return (
    <button disabled={!permissions.canPost || !user.isAuthenticated} onClick={onCreate}>
      New post
    </button>
  );
}
```

```tsx
import { useAuth, useUserDisplay } from '@opchan/react';

export function Connect() {
  const { currentUser, connect, disconnect, verifyOwnership } = useAuth();
  const display = useUserDisplay(currentUser?.address ?? '');

  return (
    <div>
      {currentUser ? (
        <>
          <span>{display.displayName}</span>
          <button onClick={() => verifyOwnership()}>Verify</button>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button
          onClick={() =>
            connect({ address: '0xabc...1234', walletType: 'ethereum' })
          }
        >
          Connect
        </button>
      )}
    </div>
  );
}
```

### API

- **Providers**
  - **`OpChanProvider`**: High-level provider that constructs an `OpChanClient` and wires persistence/events.
    - Props:
      - `config: OpChanClientConfig` — core client configuration.
      - `walletAdapter?: WalletAdapter` — optional bridge to your wallet system.
      - `children: React.ReactNode`.
    - Types:
      - `WalletAdapterAccount`: `{ address: string; walletType: 'bitcoin' | 'ethereum' }`.
      - `WalletAdapter`:
        - `getAccount(): WalletAdapterAccount | null`
        - `onChange(cb: (a: WalletAdapterAccount | null) => void): () => void`
  - **`ClientProvider`**: Low-level provider if you construct `OpChanClient` yourself.
    - Props: `{ client: OpChanClient; children: React.ReactNode }`.

- **Hooks**
  - **`useForum()`** → `{ user, content, permissions, network }` — convenience bundle of the hooks below.

  - **`useAuth()`** → session & identity actions
    - Data: `currentUser`, `verificationStatus`, `isAuthenticated`, `delegationInfo`.
    - Actions: `connect({ address, walletType })`, `disconnect()`, `verifyOwnership()`,
      `delegate(duration)`, `delegationStatus()`, `clearDelegation()`,
      `updateProfile({ callSign?, displayPreference? })`.

  - **`useContent()`** → forum data & actions
    - Data: `cells`, `posts`, `comments`, `bookmarks`, `postsByCell`, `commentsByPost`,
      `cellsWithStats`, `userVerificationStatus`, `lastSync`, `pending` helpers.
    - Actions: `createCell({ name, description, icon? })`,
      `createPost({ cellId, title, content })`,
      `createComment({ postId, content })`,
      `vote({ targetId, isUpvote })`,
      `moderate.{post,unpost,comment,uncomment,user,unuser}(...)`,
      `togglePostBookmark(post, cellId?)`, `toggleCommentBookmark(comment, postId?)`,
      `removeBookmark(bookmarkId)`, `clearAllBookmarks()`, `refresh()`.

  - **`usePermissions()`** → permission checks
    - Booleans: `canPost`, `canComment`, `canVote`, `canCreateCell`, `canDelegate`.
    - Functions: `canModerate(cellId)`, `check(action, cellId?) → { allowed, reason }`, `reasons`.

  - **`useNetwork()`** → connection state
    - Data: `isConnected`, `statusMessage`, `issues`, `canRefresh`.
    - Actions: `refresh()` — triggers a light data refresh via core.

  - **`useUIState(key, defaultValue, category?)`** → persisted UI state
    - Returns `[value, setValue, { loading, error? }]`.
    - Categories: `'wizardStates' | 'preferences' | 'temporaryStates'` (default `'preferences'`).

  - **`useUserDisplay(address)`** → identity details for any address
    - Returns `{ address, displayName, callSign?, ensName?, ordinalDetails?, verificationStatus, displayPreference, lastUpdated, isLoading, error }`.
    - Backed by a centralized identity cache; updates propagate automatically.

  - **`useClient()`** → access the underlying `OpChanClient` (advanced use only).

### Notes

- Identity resolution, verification states, and display preferences are centralized and cached;
  `useUserDisplay` and `useAuth.verifyOwnership()` will keep store and local DB in sync.
- This package is UI-agnostic; pair with your component library of choice.

### License

MIT


