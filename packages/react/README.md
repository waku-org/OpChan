## @opchan/react

Lightweight React provider and hooks for building OpChan clients on top of `@opchan/core`.

### Install

```bash
npm i @opchan/react @opchan/core react react-dom
```

### Quickstart

#### With Reown AppKit (Recommended)

OpChan integrates with Reown AppKit for wallet management. The OpChanProvider already wraps WagmiProvider and AppKitProvider internally, so you can mount it directly:

```tsx
import React from 'react';
import { OpChanProvider } from '@opchan/react';

const opchanConfig = { ordiscanApiKey: 'YOUR_ORDISCAN_API_KEY' };

function App() {
  return (
    <OpChanProvider config={opchanConfig}>
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
        <>
          <button onClick={() => connect('ethereum')}>
            Connect Ethereum
          </button>
          <button onClick={() => connect('bitcoin')}>
            Connect Bitcoin
          </button>
        </>
      )}
    </div>
  );
}
```

### API

- **Providers**
  - **`OpChanProvider`**: High-level provider that constructs an `OpChanClient` and integrates with AppKit.
    - Props:
      - `config: OpChanClientConfig` — core client configuration.
      - `children: React.ReactNode`.
    - Requirements: None — this provider already wraps `WagmiProvider` and `AppKitProvider` internally.
    - Internally provides `AppKitWalletProvider` for wallet state management.
  
  - **`AppKitWalletProvider`**: Wallet context provider (automatically included in `OpChanProvider`).
    - Provides wallet state and controls from AppKit.
  
  - **`ClientProvider`**: Low-level provider if you construct `OpChanClient` yourself.
    - Props: `{ client: OpChanClient; children: React.ReactNode }`.

- **Hooks**
  - **`useForum()`** → `{ user, content, permissions, network }` — convenience bundle of the hooks below.

  - **`useAuth()`** → session & identity actions
    - Data: `currentUser`, `verificationStatus`, `isAuthenticated`, `delegationInfo`.
    - Actions: `connect(walletType: 'bitcoin' | 'ethereum')`, `disconnect()`, `verifyOwnership()`,
      `delegate(duration)`, `delegationStatus()`, `clearDelegation()`,
      `updateProfile({ callSign?, displayPreference? })`.
  
  - **`useAppKitWallet()`** → AppKit wallet state (low-level)
    - Data: `address`, `walletType`, `isConnected`, `isInitialized`.
    - Actions: `connect(walletType)`, `disconnect()`.

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
    - Data: `isConnected`, `statusMessage`, `issues`, `isHydrated`, `canRefresh`.
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

### Runtime requirements

- Browser Buffer polyfill (for some crypto/wallet libs):
  ```ts
  import { Buffer } from 'buffer'
  if (!(window as any).Buffer) (window as any).Buffer = Buffer
  ```
- Config values you likely need to pass to `OpChanProvider`:
  - `ordiscanApiKey` (optional for dev)
  - `wakuConfig` with `contentTopic` and `reliableChannelId`
  - `reownProjectId` (e.g., from `import.meta.env.VITE_REOWN_SECRET`)

### License

MIT


