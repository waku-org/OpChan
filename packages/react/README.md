# @opchan/react

React hooks and providers for building decentralized forum applications on top of `@opchan/core`.

## Overview

`@opchan/react` provides a complete React integration layer for the OpChan protocol, featuring:

- 🔐 **Flexible Authentication** - Wallet-based (Ethereum) or anonymous sessions
- 🔑 **Key Delegation** - Browser-based signing to reduce wallet prompts
- 📝 **Content Management** - Cells, posts, comments, and votes
- 👤 **Identity System** - ENS resolution, call signs, and user profiles
- ⚖️ **Permission Management** - Role-based access control
- 🌐 **Network State** - Waku connection monitoring
- 💾 **Local-First** - IndexedDB caching with network sync

## Installation

```bash
npm install @opchan/react @opchan/core react react-dom
```

## Quick Start

### 1. Setup Provider

The `OpChanProvider` wraps WagmiProvider and QueryClientProvider internally:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OpChanProvider } from '@opchan/react';
import { Buffer } from 'buffer';
import App from './App';

// Required polyfill for crypto libraries
if (!(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <OpChanProvider 
    config={{ 
      wakuConfig: {
        contentTopic: '/opchan/1/messages/proto',
        reliableChannelId: 'opchan-messages'
      },
      reownProjectId: 'your-reown-project-id' // For WalletConnect
    }}
  >
    <App />
  </OpChanProvider>
);
```

### 2. Use Hooks in Your App

```tsx
import { useForum } from '@opchan/react';

export function MyComponent() {
  const { user, content, permissions, network } = useForum();

  return (
    <div>
      <h1>Cells: {content.cells.length}</h1>
      <p>Network: {network.isConnected ? 'Connected' : 'Disconnected'}</p>
      {permissions.canPost && <button>Create Post</button>}
    </div>
  );
}
```

## Core Concepts

### Authentication Modes

OpChan supports three authentication modes:

1. **Anonymous** (`ANONYMOUS`) - Browser-only session, no wallet required
   - Can post, comment, and vote
   - Cannot create cells
   - Optional call sign for identity

2. **Wallet Connected** (`WALLET_CONNECTED`) - Ethereum wallet connected
   - Full interaction capabilities
   - Can create posts, comment, vote
   - Cannot create cells (requires ENS verification)

3. **ENS Verified** (`ENS_VERIFIED`) - Wallet + ENS ownership verified
   - Full platform access
   - Can create cells (becomes cell admin)
   - Enhanced relevance scoring for content

### Key Delegation

To reduce wallet signature prompts, OpChan uses browser-based key delegation:

- **For Wallet Users**: Wallet signs authorization for browser keys (7 or 30 days)
- **For Anonymous Users**: Browser keys generated automatically (no wallet signature)

This enables one-time wallet interaction with subsequent actions signed by browser keys.

## API Reference

### Hooks

#### `useForum()`

Convenience hook that bundles all core hooks:

```tsx
const { user, content, permissions, network } = useForum();
```

Equivalent to:
```tsx
const user = useAuth();
const content = useContent();
const permissions = usePermissions();
const network = useNetwork();
```

---

#### `useAuth()`

Manages user session, authentication, and identity.

**Data:**
- `currentUser: User | null` - Current authenticated user
- `verificationStatus: EVerificationStatus` - Authentication level
- `isAuthenticated: boolean` - Whether user is logged in (wallet or anonymous)
- `delegationInfo: { hasDelegation, isValid, timeRemaining?, expiresAt? }` - Delegation status

**Actions:**
- `connect()` - Open wallet connection modal
- `disconnect()` - Disconnect wallet or exit anonymous session
- `startAnonymous(): Promise<string | null>` - Start anonymous session, returns sessionId
- `verifyOwnership(): Promise<boolean>` - Verify ENS ownership
- `delegate(duration: '7days' | '30days'): Promise<boolean>` - Create wallet delegation
- `delegationStatus(): Promise<DelegationStatus>` - Check delegation status
- `clearDelegation(): Promise<boolean>` - Clear stored delegation
- `updateProfile({ callSign?, displayPreference? }): Promise<boolean>` - Update user profile

**Example:**
```tsx
function AuthButton() {
  const { currentUser, connect, startAnonymous, disconnect } = useAuth();
  
  if (currentUser) {
    return <button onClick={disconnect}>Disconnect</button>;
  }
  
  return (
    <>
      <button onClick={connect}>Connect Wallet</button>
      <button onClick={startAnonymous}>Continue Anonymously</button>
    </>
  );
}
```

---

#### `useContent()`

Access forum content and perform content actions.

**Data:**
- `cells: Cell[]` - All cells
- `posts: Post[]` - All posts
- `comments: Comment[]` - All comments
- `bookmarks: Bookmark[]` - User's bookmarks
- `postsByCell: Record<string, Post[]>` - Posts grouped by cell
- `commentsByPost: Record<string, Comment[]>` - Comments grouped by post
- `cellsWithStats: Cell[]` - Cells with computed stats (activeMembers, relevance)
- `userVerificationStatus: Record<string, { isVerified, hasENS, ensName? }>` - Verification cache
- `lastSync: number | null` - Last network sync timestamp
- `pending: { isPending(id), onChange(callback) }` - Pending operations tracking

**Actions:**
- `createCell({ name, description, icon? }): Promise<Cell | null>`
- `createPost({ cellId, title, content }): Promise<Post | null>`
- `createComment({ postId, content }): Promise<Comment | null>`
- `vote({ targetId, isUpvote }): Promise<boolean>`
- `moderate.post(cellId, postId, reason?)` - Moderate a post
- `moderate.unpost(cellId, postId)` - Unmoderate a post
- `moderate.comment(cellId, commentId, reason?)` - Moderate a comment
- `moderate.uncomment(cellId, commentId)` - Unmoderate a comment
- `moderate.user(cellId, userAddress, reason?)` - Moderate a user
- `moderate.unuser(cellId, userAddress)` - Unmoderate a user
- `togglePostBookmark(post, cellId?): Promise<void>` - Toggle post bookmark
- `toggleCommentBookmark(comment, postId?): Promise<void>` - Toggle comment bookmark
- `removeBookmark(bookmarkId): Promise<void>` - Remove specific bookmark
- `clearAllBookmarks(): Promise<void>` - Clear all bookmarks
- `refresh(): Promise<void>` - Refresh content from cache

**Example:**
```tsx
function CreatePostForm({ cellId }: { cellId: string }) {
  const { createPost } = useContent();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    const post = await createPost({ cellId, title, content });
    if (post) {
      setTitle('');
      setContent('');
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">Post</button>
    </form>
  );
}
```

---

#### `usePermissions()`

Check user permissions for various actions.

**Data:**
- `canPost: boolean` - Can create posts (wallet or anonymous)
- `canComment: boolean` - Can create comments (wallet or anonymous)
- `canVote: boolean` - Can vote (wallet or anonymous)
- `canCreateCell: boolean` - Can create cells (ENS verified only)
- `canDelegate: boolean` - Can delegate keys (wallet only)
- `canModerate(cellId): boolean` - Can moderate cell (cell creator only)
- `reasons: { post, comment, vote, createCell, moderate(cellId) }` - Reason strings when permission denied
- `check(action, cellId?): { allowed, reason }` - Unified permission check

**Example:**
```tsx
function PostActions() {
  const permissions = usePermissions();
  
  return (
    <div>
      <button disabled={!permissions.canVote}>
        {permissions.canVote ? 'Upvote' : permissions.reasons.vote}
      </button>
      {!permissions.canCreateCell && (
        <p>{permissions.reasons.createCell}</p>
      )}
    </div>
  );
}
```

---

#### `useNetwork()`

Monitor Waku network connection state.

**Data:**
- `isConnected: boolean` - Waku network connection status
- `statusMessage: string` - Human-readable status
- `issues: string[]` - Connection issues
- `isHydrated: boolean` - Whether initial data loaded
- `canRefresh: boolean` - Whether refresh is available

**Actions:**
- `refresh(): Promise<void>` - Refresh network data

**Example:**
```tsx
function NetworkIndicator() {
  const { isConnected, statusMessage, refresh } = useNetwork();
  
  return (
    <div>
      <span>{statusMessage}</span>
      {!isConnected && <button onClick={refresh}>Reconnect</button>}
    </div>
  );
}
```

---

#### `useUserDisplay(address: string)`

Get display information for any user address (wallet or anonymous).

**Returns:**
- `address: string` - User's address or session ID
- `displayName: string` - Computed display name
- `callSign?: string` - User's call sign
- `ensName?: string` - ENS name (wallet users only)
- `ensAvatar?: string` - ENS avatar URL
- `verificationStatus: EVerificationStatus` - Verification level
- `displayPreference: EDisplayPreference` - Display preference
- `lastUpdated: number` - Last identity update timestamp
- `isLoading: boolean` - Loading state
- `error?: string` - Error message

**Example:**
```tsx
function AuthorBadge({ authorAddress }: { authorAddress: string }) {
  const { displayName, callSign, ensName, verificationStatus } = 
    useUserDisplay(authorAddress);
  
  return (
    <div>
      <span>{displayName}</span>
      {ensName && <span className="badge">ENS</span>}
      {callSign && <span className="badge">Call Sign</span>}
    </div>
  );
}
```

---

#### `useUIState<T>(key, defaultValue, category?)`

Persist UI state to IndexedDB with React state management.

**Parameters:**
- `key: string` - Unique key for the state
- `defaultValue: T` - Default value
- `category?: 'wizardStates' | 'preferences' | 'temporaryStates'` - Storage category (default: 'preferences')

**Returns:**
- `[value, setValue, { loading, error? }]` - Similar to useState with persistence

**Example:**
```tsx
function ThemeToggle() {
  const [darkMode, setDarkMode] = useUIState('darkMode', true, 'preferences');
  
  return (
    <button onClick={() => setDarkMode(!darkMode)}>
      {darkMode ? 'Light' : 'Dark'} Mode
    </button>
  );
}
```

---

#### `useEthereumWallet()`

Low-level access to Ethereum wallet state (advanced use).

**Data:**
- `address: string | null`
- `isConnected: boolean`
- `connectors: Connector[]`
- `publicClient: PublicClient`
- `walletClient: WalletClient`

**Actions:**
- `connect(connectorId?): Promise<void>`
- `disconnect(): Promise<void>`
- `signMessage(message): Promise<string>`

---

#### `useClient()`

Access the underlying `OpChanClient` instance (advanced use only).

```tsx
const client = useClient();
// Access low-level APIs:
// - client.database
// - client.delegation
// - client.forumActions
// - client.userIdentityService
// - client.messageManager
```

## Usage Patterns

### Pattern 1: Anonymous-First UX

Allow users to interact immediately without wallet connection:

```tsx
function PostPage() {
  const { user, permissions } = useForum();
  
  return (
    <>
      {!user.currentUser && (
        <div>
          <button onClick={user.connect}>Connect Wallet</button>
          <button onClick={user.startAnonymous}>Continue Anonymously</button>
        </div>
      )}
      
      {permissions.canComment && <CommentForm />}
      
      {user.verificationStatus === 'anonymous' && !user.currentUser?.callSign && (
        <CallSignPrompt />
      )}
    </>
  );
}
```

### Pattern 2: Permission-Based UI

Show/hide features based on user capabilities:

```tsx
function CellActions() {
  const { permissions } = useForum();
  const check = permissions.check('canCreateCell');
  
  return (
    <div>
      {check.allowed ? (
        <CreateCellButton />
      ) : (
        <p>{check.reason}</p>
      )}
    </div>
  );
}
```

### Pattern 3: Real-Time Content Updates

Listen to content changes with React state:

```tsx
function PostList({ cellId }: { cellId: string }) {
  const { postsByCell, pending } = useContent();
  const posts = postsByCell[cellId] || [];
  
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          {post.title}
          {pending.isPending(post.id) && <span>Syncing...</span>}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 4: User Identity Display

Display user information with automatic updates:

```tsx
function UserAvatar({ address }: { address: string }) {
  const { displayName, ensName, callSign, ensAvatar } = useUserDisplay(address);
  
  return (
    <div>
      {ensAvatar && <img src={ensAvatar} alt={displayName} />}
      <span>{displayName}</span>
      {ensName && <span className="badge">ENS: {ensName}</span>}
      {callSign && <span className="badge">#{callSign}</span>}
    </div>
  );
}
```

## Authentication Flows

### Anonymous User Flow

```tsx
// 1. Start anonymous session
const sessionId = await startAnonymous();

// 2. User can immediately interact
await createPost({ cellId, title, content });
await vote({ targetId: postId, isUpvote: true });

// 3. Optionally set call sign
await updateProfile({ callSign: 'my_username' });

// 4. Later upgrade to wallet if desired
await connect();
```

### Wallet User Flow

```tsx
// 1. Connect wallet
await connect();
// User is now WALLET_CONNECTED

// 2. Optionally verify ENS ownership
const isVerified = await verifyOwnership();
// If ENS found, user becomes ENS_VERIFIED

// 3. Delegate browser keys for better UX
await delegate('7days');
// Subsequent actions don't require wallet signatures

// 4. Interact with platform
await createCell({ name, description });
await createPost({ cellId, title, content });
```

## Type Definitions

### User

```typescript
type User = {
  address: string; // 0x${string} for wallet, UUID for anonymous
  displayName: string;
  displayPreference: EDisplayPreference;
  verificationStatus: EVerificationStatus;
  callSign?: string;
  ensName?: string;
  ensAvatar?: string;
  lastChecked?: number;
};
```

### EVerificationStatus

```typescript
enum EVerificationStatus {
  ANONYMOUS = 'anonymous',
  WALLET_UNCONNECTED = 'wallet-unconnected',
  WALLET_CONNECTED = 'wallet-connected',
  ENS_VERIFIED = 'ens-verified',
}
```

### Cell, Post, Comment

All content types include:
- Cryptographic signatures
- Author information
- Timestamps
- Relevance scores
- Moderation state

See `@opchan/core` for detailed type definitions.

## Advanced Usage

### Custom Permission Logic

```tsx
function AdminPanel({ cellId }: { cellId: string }) {
  const { permissions, content } = useForum();
  const cell = content.cells.find(c => c.id === cellId);
  
  if (!permissions.canModerate(cellId)) {
    return <p>Admin access required</p>;
  }
  
  return <ModerationTools cell={cell} />;
}
```

### Message Pending States

```tsx
function PostWithSyncStatus({ post }: { post: Post }) {
  const { pending } = useContent();
  const [isPending, setIsPending] = useState(pending.isPending(post.id));
  
  useEffect(() => {
    return pending.onChange(() => {
      setIsPending(pending.isPending(post.id));
    });
  }, [post.id]);
  
  return (
    <div>
      {post.title}
      {isPending && <span className="badge">Syncing...</span>}
    </div>
  );
}
```

### Identity Cache Management

```tsx
function UserList({ addresses }: { addresses: string[] }) {
  return addresses.map(addr => {
    const display = useUserDisplay(addr);
    // Identity automatically cached and shared across all components
    // Updates propagate automatically when user profiles change
    return <UserCard key={addr} {...display} />;
  });
}
```

## Configuration

### OpChanProvider Config

```typescript
interface OpChanProviderProps {
  config: {
    wakuConfig?: {
      contentTopic?: string;
      reliableChannelId?: string;
    };
    reownProjectId?: string; // For WalletConnect v2
  };
  children: React.ReactNode;
}
```

## Complete Example App

Here's a minimal working example that demonstrates all the key patterns:

### 1. Main Entry Point (`main.tsx`)

```tsx
import { createRoot } from 'react-dom/client';
import { OpChanProvider } from '@opchan/react';
import { Buffer } from 'buffer';
import App from './App';

// Required polyfill
if (!(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <OpChanProvider 
    config={{ 
      wakuConfig: {
        contentTopic: '/opchan/1/messages/proto',
        reliableChannelId: 'opchan-messages'
      },
      reownProjectId: import.meta.env.VITE_REOWN_SECRET || '2ead96ea166a03e5ab50e5c190532e72'
    }}
  >
    <App />
  </OpChanProvider>
);
```

### 2. App Component (`App.tsx`)

```tsx
import { useForum } from '@opchan/react';

export default function App() {
  const { user, content, permissions, network } = useForum();

  // Wait for initial data load
  if (!network.isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto p-4">
        {!user.currentUser ? (
          <AuthPrompt />
        ) : (
          <ForumInterface />
        )}
      </main>
    </div>
  );
}
```

### 3. Authentication Component (`AuthPrompt.tsx`)

```tsx
import { useAuth } from '@opchan/react';

export function AuthPrompt() {
  const { connect, startAnonymous } = useAuth();

  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">Welcome to OpChan</h1>
      <p className="text-gray-400">Choose how you'd like to participate:</p>
      
      <div className="space-y-2">
        <button 
          onClick={connect}
          className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
        <button 
          onClick={startAnonymous}
          className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
        >
          Continue Anonymously
        </button>
      </div>
    </div>
  );
}
```

### 4. Header Component (`Header.tsx`)

```tsx
import { useAuth } from '@opchan/react';

export function Header() {
  const { currentUser, disconnect, verificationStatus } = useAuth();

  return (
    <header className="bg-gray-800 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">OpChan</h1>
        
        {currentUser ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {currentUser.displayName}
              {verificationStatus === 'anonymous' && ' (Anonymous)'}
              {verificationStatus === 'ens-verified' && ' (ENS)'}
            </span>
            <button 
              onClick={disconnect}
              className="text-sm text-gray-400 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
```

### 5. Forum Interface (`ForumInterface.tsx`)

```tsx
import { useContent, usePermissions } from '@opchan/react';

export function ForumInterface() {
  const { cells, posts, createPost } = useContent();
  const { canPost, canCreateCell } = usePermissions();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cells</h2>
        {canCreateCell && (
          <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
            Create Cell
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cells.map(cell => (
          <CellCard key={cell.id} cell={cell} />
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
        <div className="space-y-2">
          {posts.slice(0, 10).map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 6. Cell Card Component (`CellCard.tsx`)

```tsx
import { useContent } from '@opchan/react';

export function CellCard({ cell }) {
  const { postsByCell } = useContent();
  const cellPosts = postsByCell[cell.id] || [];

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold">{cell.name}</h3>
      <p className="text-sm text-gray-400 mb-2">{cell.description}</p>
      <div className="text-xs text-gray-500">
        {cellPosts.length} posts
      </div>
    </div>
  );
}
```

### 7. Post Card Component (`PostCard.tsx`)

```tsx
import { useUserDisplay } from '@opchan/react';

export function PostCard({ post }) {
  const { displayName, callSign, ensName } = useUserDisplay(post.author);

  return (
    <div className="bg-gray-800 p-3 rounded">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium">
          {displayName}
          {callSign && ` (#${callSign})`}
          {ensName && ` (${ensName})`}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(post.timestamp).toLocaleDateString()}
        </span>
      </div>
      <h4 className="font-medium">{post.title}</h4>
      <p className="text-sm text-gray-400 mt-1">{post.content}</p>
    </div>
  );
}
```

### 8. Package.json Dependencies

```json
{
  "dependencies": {
    "@opchan/react": "^1.1.0",
    "@opchan/core": "^1.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "buffer": "^6.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

### 9. Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});
```

### 10. Environment Variables (`.env`)

```bash
VITE_REOWN_SECRET=your_reown_project_id_here
```

## Best Practices

1. **Use `useForum()` for most cases** - Cleaner than importing individual hooks
2. **Check permissions before showing UI** - Better UX than showing disabled buttons
3. **Handle anonymous users gracefully** - Offer both wallet and anonymous options
4. **Use `useUserDisplay` for all identity rendering** - Automatic caching and updates
5. **Monitor `network.isHydrated`** - Wait for initial data before rendering content
6. **Use `pending` helpers** - Show loading states for async operations
7. **Preserve verification status** - When updating anonymous users, maintain their status

## Migration from v1.0

### Breaking Changes in v2.0

- Added `ANONYMOUS` verification status
- `delegationProof` is now optional in messages
- `startAnonymous()` method added to `useAuth()`
- Permission checks now support anonymous users
- `User.address` is now `string` (was `0x${string}`)

### Migration Steps

1. Update permission checks to handle anonymous users
2. Update UI to offer anonymous option alongside wallet connection
3. Handle both wallet addresses and session IDs in identity display
4. Test message verification with optional delegation proofs

## Troubleshooting

### Error: "useClient must be used within ClientProvider"

**Root Cause:** Components using `@opchan/react` hooks are not wrapped by `OpChanProvider`.

**Solution:**
```tsx
// ❌ WRONG - Hooks used outside provider
function App() {
  const { currentUser } = useAuth(); // This will fail
  return <div>Hello</div>;
}

// ✅ CORRECT - All hooks inside provider
function App() {
  return (
    <OpChanProvider config={config}>
      <MainApp />
    </OpChanProvider>
  );
}

function MainApp() {
  const { currentUser } = useAuth(); // This works
  return <div>Hello</div>;
}
```

### Error: Wallet Connection Fails

**Root Cause:** Missing or invalid `reownProjectId` in provider config.

**Solution:**
```tsx
// ❌ WRONG - Missing reownProjectId
<OpChanProvider config={{ wakuConfig: {...} }}>

// ✅ CORRECT - Include reownProjectId
<OpChanProvider config={{ 
  wakuConfig: {...},
  reownProjectId: 'your-project-id' 
}}>
```

### Error: "Buffer is not defined"

**Root Cause:** Missing Buffer polyfill for crypto libraries.

**Solution:**
```tsx
import { Buffer } from 'buffer';

// Add before rendering
if (!(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}
```

### Anonymous users can't interact after setting call sign
- Ensure `mapVerificationStatus` includes `ANONYMOUS` case
- Check that `updateProfile` preserves `verificationStatus`

### Wallet sync clearing anonymous sessions
- Verify wallet disconnect logic checks for anonymous users before clearing

### Permission checks failing for anonymous users
- Ensure `isAnonymous` is included in permission conditions
- Check that `canPost/canComment/canVote` return true for anonymous

## License

MIT

---

**Built with ❤️ for decentralized communities**
