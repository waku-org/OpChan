# Master Prompt: Building a Decentralized Forum App with @opchan/react

## Objective
Build a complete, production-ready decentralized forum application using the `@opchan/react` library. The app should support anonymous and wallet-based authentication, real-time content updates, and a modern, cyberpunk-inspired UI.

## Core Requirements

### 1. Authentication System

Implement a **dual-mode authentication system**:

#### Anonymous Mode
- Users can browse and interact immediately without wallet
- Generate browser-based session (UUID) with ed25519 keypair
- Allow posting, commenting, and voting
- Support optional call sign for identity
- Session persists in IndexedDB

#### Wallet Mode  
- Support Ethereum wallet connection (MetaMask, WalletConnect, Coinbase)
- Use wagmi v2.x for wallet management
- Implement ENS verification for premium features
- Support browser key delegation to reduce signature prompts

**Implementation Pattern:**
```tsx
const { currentUser, connect, startAnonymous, verificationStatus } = useAuth();

// Offer both options
<button onClick={connect}>Connect Wallet</button>
<button onClick={startAnonymous}>Continue Anonymously</button>

// Check verification level
if (verificationStatus === EVerificationStatus.ANONYMOUS) {
  // Show call sign setup
} else if (verificationStatus === EVerificationStatus.ENS_VERIFIED) {
  // Show cell creation
}
```

### 2. Content Management

Implement a **hierarchical content system**:

- **Cells** - Discussion boards (require ENS to create)
- **Posts** - Threads within cells (any authenticated user)
- **Comments** - Replies to posts (any authenticated user)  
- **Votes** - Upvote/downvote (any authenticated user)

**Implementation Pattern:**
```tsx
const { createPost, createComment, vote, posts, comments } = useContent();

// Create content
await createPost({ cellId, title, content });
await createComment({ postId, content });
await vote({ targetId: postId, isUpvote: true });

// Display content with grouped data
const { postsByCell, commentsByPost } = useContent();
const cellPosts = postsByCell[cellId] || [];
const postComments = commentsByPost[postId] || [];
```

### 3. Permission System

Implement **role-based access control**:

| Action | Anonymous | Wallet | ENS Verified |
|--------|-----------|--------|--------------|
| View | ✅ | ✅ | ✅ |
| Vote | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| Post | ✅ | ✅ | ✅ |
| Create Cell | ❌ | ❌ | ✅ |
| Moderate | ❌ | ❌ | ✅ (own cells) |

**Implementation Pattern:**
```tsx
const { canPost, canComment, canCreateCell, canModerate, check } = usePermissions();

// Show/hide UI based on permissions
{canCreateCell && <CreateCellButton />}

// Detailed permission check
const { allowed, reason } = check('canPost');
{!allowed && <p>{reason}</p>}

// Conditional features
{canModerate(cellId) && <ModerationTools />}
```

### 4. User Identity Display

Implement **flexible identity rendering** for both wallet and anonymous users:

**Implementation Pattern:**
```tsx
const { displayName, callSign, ensName, ensAvatar } = useUserDisplay(address);

// Render user identity
<div>
  {ensAvatar && <img src={ensAvatar} />}
  <span>{displayName}</span>
  
  {/* Verification badges */}
  {callSign && <Badge><Hash /> Call Sign</Badge>}
  {ensName && <Badge><Crown /> ENS</Badge>}
  {isAnonymous(address) && <Badge><UserX /> Anonymous</Badge>}
</div>

// Detect anonymous users
function isAnonymous(address: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(address);
}
```

### 5. Onboarding Flow

Create a **3-step wizard for wallet users**, **instant access for anonymous**:

**Wallet Wizard Steps:**
1. **Connect Wallet** - Choose wallet connector
2. **Verify Ownership** - Check for ENS (optional, can skip)
3. **Delegate Key** - Generate browser keys for better UX

**Anonymous Flow:**
- Click "Continue Anonymously" → Wizard closes immediately
- Show call sign setup in header dropdown
- Allow interaction immediately

**Implementation Pattern:**
```tsx
// In wallet wizard
const handleStepComplete = (step) => {
  if (step === 1 && verificationStatus === EVerificationStatus.ANONYMOUS) {
    // Close wizard immediately for anonymous users
    onComplete();
    return;
  }
  // Continue to next step for wallet users
  setCurrentStep(step + 1);
};
```

### 6. Real-Time Updates

Implement **optimistic UI updates** with network sync:

**Implementation Pattern:**
```tsx
const { pending, lastSync } = useContent();
const isPending = pending.isPending(post.id);

// Show pending state
{isPending && <Loader2 className="animate-spin" />}

// Listen to pending changes
useEffect(() => {
  return pending.onChange(() => {
    // Update UI when pending state changes
  });
}, []);

// Network status
{!network.isConnected && <button onClick={refresh}>Reconnect</button>}
```

### 7. Call Sign System

Allow **all users (wallet and anonymous) to set call signs**:

**Implementation Patterns:**
```tsx
// Anonymous users: Show inline prompt
{currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS && 
 !currentUser.callSign && (
  <InlineCallSignInput />
)}

// All users: Header dropdown option
<DropdownMenuItem onClick={() => setCallSignDialogOpen(true)}>
  {currentUser?.callSign ? 'Update' : 'Set'} Call Sign
</DropdownMenuItem>

// Update profile
await updateProfile({ callSign: 'my_username' });

// Display shows call sign when available
{callSign || 'Anonymous User'}
```

### 8. Moderation System

Implement **cell-based moderation** (no global censorship):

**Implementation Pattern:**
```tsx
const { moderate } = useContent();
const { canModerate } = usePermissions();

if (canModerate(cellId)) {
  // Moderate content
  await moderate.post(cellId, postId, 'Spam');
  await moderate.comment(cellId, commentId, 'Off-topic');
  await moderate.user(cellId, userAddress, 'Harassment');
  
  // Unmoderate
  await moderate.unpost(cellId, postId);
}

// Hide moderated content by default
const visiblePosts = posts.filter(p => !p.moderated);

// Admin toggle to show moderated
const [showModerated, setShowModerated] = useUIState('showModerated', false);
const displayPosts = showModerated ? posts : visiblePosts;
```

### 9. Relevance Scoring UI

Display **relevance scores** to help users find quality content:

**Implementation Pattern:**
```tsx
// Sort by relevance
const sortedPosts = [...posts].sort((a, b) => 
  (b.relevanceScore || 0) - (a.relevanceScore || 0)
);

// Show relevance details
{post.relevanceDetails && (
  <div>
    <span>Score: {post.relevanceDetails.finalScore.toFixed(1)}</span>
    <span>Upvotes: {post.relevanceDetails.upvotes}</span>
    <span>Verified: {post.relevanceDetails.verifiedUpvotes}</span>
  </div>
)}
```

### 10. Network Status Indicator

Show **Waku network connection state**:

**Implementation Pattern:**
```tsx
const { isConnected, statusMessage, isHydrated } = useNetwork();

// Health indicator
<div className={isConnected ? 'text-green-500' : 'text-red-500'}>
  <WakuHealthDot />
  <span>{statusMessage}</span>
</div>

// Wait for hydration before showing content
{isHydrated ? <Content /> : <LoadingSkeleton />}
```

## Critical Implementation Details

### State Preservation for Anonymous Users

**Problem**: Wallet sync effects may clear anonymous users
**Solution**: Check verification status before clearing:

```tsx
// In useAuth hook
useEffect(() => {
  if (!wallet.isConnected && currentUser && 
      currentUser.verificationStatus !== EVerificationStatus.ANONYMOUS) {
    // Only clear non-anonymous users
    clearUser();
  }
}, [wallet.isConnected, currentUser]);
```

### Verification Status Preservation

**Problem**: Profile updates may reset verification status
**Solution**: Force preservation when updating:

```tsx
const updateProfile = async (updates) => {
  const res = await client.userIdentityService.updateProfile(address, updates);
  const updated = {
    ...currentUser,
    ...res.identity,
    verificationStatus: currentUser.verificationStatus, // Preserve!
  };
  setOpchanState(prev => ({ ...prev, session: { ...prev.session, currentUser: updated } }));
};
```

### Verification Status Mapping

**Problem**: Status mapper doesn't handle ANONYMOUS
**Solution**: Add ANONYMOUS case:

```tsx
private mapVerificationStatus(status: string): EVerificationStatus {
  switch (status) {
    case EVerificationStatus.ANONYMOUS:
      return EVerificationStatus.ANONYMOUS; // Add this!
    case EVerificationStatus.WALLET_CONNECTED:
      return EVerificationStatus.WALLET_CONNECTED;
    // ... other cases
    default:
      return EVerificationStatus.WALLET_UNCONNECTED;
  }
}
```

### Message Verification

**Problem**: Network peers must accept anonymous messages
**Solution**: Make delegationProof optional in verification:

```tsx
async verify(message: OpchanMessage): Promise<boolean> {
  // Verify message signature (always required)
  if (!verifyMessageSignature(message)) return false;
  
  // If has delegationProof, verify it (wallet user)
  if (message.delegationProof) {
    return verifyDelegationProof(message.delegationProof, message.author);
  }
  
  // Anonymous message - verify session ID format
  return isValidSessionId(message.author);
}
```

## UI/UX Guidelines

### Design System
- **Colors**: Dark theme with cyan/blue accents
- **Typography**: Monospace fonts for technical aesthetic
- **Components**: Use shadcn/ui patterns
- **Spacing**: Consistent spacing with Tailwind scale
- **Icons**: Lucide React icons

### Key UI Components to Build

1. **Header Component**
   - Logo/branding
   - Navigation (Home, Cells, Profile, Bookmarks)
   - Auth button (Connect/User dropdown)
   - Network status indicator
   - Call sign setup for anonymous users

2. **Wallet Wizard**
   - Step indicator (1/2/3)
   - Wallet connection (Step 1)
   - ENS verification (Step 2)
   - Key delegation (Step 3)
   - Anonymous bypass option

3. **Cell List**
   - Grid/list view of cells
   - Active member count
   - Recent activity indicator
   - "Create Cell" button (ENS only)

4. **Post List**
   - Post cards with vote buttons
   - Author display with badges
   - Relevance score indicator
   - Create post form (if has permission)
   - Call sign prompt (anonymous without call sign)

5. **Post Detail**
   - Full post content (markdown)
   - Vote buttons
   - Comment thread
   - Comment form
   - Moderation tools (if cell admin)

6. **Author Display**
   - Handle wallet addresses (0x...)
   - Handle anonymous (UUID pattern)
   - Show call sign when available
   - Show ENS when available
   - Badge system (ENS, Call Sign, Anonymous)

7. **Profile Page**
   - User information
   - Call sign management
   - Display preferences
   - Security section (wallet: delegation status, anonymous: session info)

8. **Inline Call Sign Input**
   - For anonymous users without call sign
   - Contextual placement (where interaction blocked)
   - Validation (3-20 chars, alphanumeric)
   - Immediate feedback

## Data Patterns

### Content Grouping

```tsx
// Group posts by cell
const { postsByCell } = useContent();
const cellPosts = postsByCell[cellId] || [];

// Group comments by post  
const { commentsByPost } = useContent();
const postComments = commentsByPost[postId] || [];

// User verification status cache
const { userVerificationStatus } = useContent();
const isVerified = userVerificationStatus[authorAddress]?.isVerified;
```

### Bookmarks

```tsx
const { bookmarks, togglePostBookmark, toggleCommentBookmark } = useContent();

// Check if bookmarked
const isBookmarked = bookmarks.some(b => b.targetId === post.id && b.type === 'post');

// Toggle bookmark
await togglePostBookmark(post, cellId);
await toggleCommentBookmark(comment, postId);
```

### Sorting

```tsx
// Sort by relevance (default)
const sorted = [...posts].sort((a, b) => 
  (b.relevanceScore || 0) - (a.relevanceScore || 0)
);

// Sort by time
const recent = [...posts].sort((a, b) => b.timestamp - a.timestamp);

// Sort by votes
const popular = [...posts].sort((a, b) => 
  (b.upvotes?.length || 0) - (a.upvotes?.length || 0)
);
```

## Critical Success Factors

### ✅ Must Have

1. **Immediate Engagement** - Anonymous users can interact without barriers
2. **Clear Permission Feedback** - Users know what they can/can't do and why
3. **Identity Flexibility** - Support wallet addresses, ENS names, call signs, and anonymous
4. **Optimistic UI** - Instant feedback with background sync
5. **Network Resilience** - Handle disconnections gracefully
6. **State Preservation** - Don't clear anonymous users on wallet events
7. **Verification Preservation** - Maintain verification status through profile updates

### ⚠️ Common Pitfalls to Avoid

1. ❌ **Clearing anonymous sessions** - Check verification status before clearing users
2. ❌ **Hardcoding wallet-only flows** - Always support anonymous mode
3. ❌ **Forgetting to add ANONYMOUS to enums** - Update all status mappers
4. ❌ **Blocking anonymous users** - They should interact freely (except cell creation)
5. ❌ **Not showing call sign option** - Make it prominent for anonymous users
6. ❌ **Complex onboarding** - Keep anonymous flow instant (no wizard steps)
7. ❌ **Assuming addresses are 0x format** - Support both wallet addresses and UUIDs

## Complete Feature Checklist

### Authentication & Identity
- [ ] Anonymous session creation
- [ ] Wallet connection (Ethereum)
- [ ] ENS verification
- [ ] Key delegation (wallet users)
- [ ] Call sign setup (all users)
- [ ] Display preferences
- [ ] Session persistence
- [ ] Disconnect/exit flows

### Content Features
- [ ] Cell creation (ENS only)
- [ ] Post creation
- [ ] Comment creation (nested threading)
- [ ] Upvote/downvote
- [ ] Bookmark management
- [ ] Markdown support
- [ ] Content sorting (relevance, new, top)
- [ ] Author attribution

### Moderation
- [ ] Moderate posts
- [ ] Moderate comments
- [ ] Moderate users
- [ ] Admin-only access
- [ ] Show/hide moderated toggle
- [ ] Moderation reasons

### UI Components
- [ ] Header with auth state
- [ ] Wallet wizard (3 steps)
- [ ] Cell list with stats
- [ ] Post list/feed
- [ ] Post detail with comments
- [ ] Comment threads
- [ ] Vote buttons
- [ ] Author display with badges
- [ ] Network status indicator
- [ ] Loading states
- [ ] Error handling
- [ ] Call sign input (inline + dialog)
- [ ] Profile page

### Developer Experience
- [ ] TypeScript strict mode
- [ ] Proper error handling
- [ ] Loading states
- [ ] Optimistic updates
- [ ] Hot reload support
- [ ] Build optimization

## Technical Stack

### Required Dependencies

```json
{
  "dependencies": {
    "@opchan/react": "^1.1.0",
    "@opchan/core": "^1.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "buffer": "^6.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Critical Setup Requirements

**⚠️ IMPORTANT: Provider Configuration**

The `OpChanProvider` must be properly configured to avoid the "useClient must be used within ClientProvider" error:

```tsx
// ✅ CORRECT - Complete setup
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
      reownProjectId: 'your-reown-project-id' // ⚠️ REQUIRED for WalletConnect
    }}
  >
    <App />
  </OpChanProvider>
);
```

**Common Setup Mistakes:**

1. **Missing reownProjectId** - Causes wallet connection failures
2. **Missing Buffer polyfill** - Causes crypto library errors
3. **Provider not wrapping all components** - Causes "useClient must be used within ClientProvider" error
4. **Using hooks outside provider** - All `@opchan/react` hooks must be inside `OpChanProvider`

**Environment Variables:**

```bash
# .env
VITE_REOWN_SECRET=your_reown_project_id_here
```

**Vite Configuration (if using Vite):**

```typescript
// vite.config.ts
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

### Recommended UI Libraries

- **shadcn/ui** - Accessible component primitives
- **Radix UI** - Unstyled accessible components
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **date-fns** - Date formatting
- **react-hook-form** - Form handling
- **zod** - Schema validation

## Example App Structure

```
src/
├── main.tsx                      # Entry point with OpChanProvider
├── App.tsx                       # Router setup
├── hooks/
│   └── index.ts                  # Re-export @opchan/react hooks
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── wallet-wizard.tsx     # 3-step onboarding
│   │   ├── wallet-connection-step.tsx
│   │   ├── verification-step.tsx
│   │   ├── delegation-step.tsx
│   │   ├── author-display.tsx    # User identity display
│   │   ├── inline-callsign-input.tsx
│   │   ├── call-sign-setup-dialog.tsx
│   │   └── ...                   # Other UI primitives
│   ├── Header.tsx                # Navigation + auth
│   ├── PostList.tsx              # Post feed
│   ├── PostDetail.tsx            # Single post view
│   ├── PostCard.tsx              # Post preview
│   ├── CommentCard.tsx           # Comment display
│   ├── CellList.tsx              # Cell grid
│   └── CreateCellDialog.tsx      # Cell creation modal
├── pages/
│   ├── Dashboard.tsx             # Landing page
│   ├── Index.tsx                 # Cell list page
│   ├── CellPage.tsx              # Cell detail
│   ├── PostPage.tsx              # Post detail
│   ├── ProfilePage.tsx           # User profile
│   ├── BookmarksPage.tsx         # Saved content
│   └── NotFound.tsx              # 404 page
└── utils/
    └── sorting.ts                # Content sorting utilities
```

## Code Examples

### Complete Anonymous Flow Implementation

```tsx
// 1. Wallet Wizard with Anonymous Option
export function WalletWizard() {
  const { startAnonymous, verificationStatus } = useAuth();
  
  const handleAnonymous = async () => {
    const sessionId = await startAnonymous();
    if (sessionId) {
      onComplete(); // Close wizard immediately
    }
  };
  
  return (
    <Dialog>
      <DialogContent>
        {/* Wallet connection UI */}
        <Button onClick={connectWallet}>Connect Wallet</Button>
        
        {/* Anonymous option */}
        <div className="separator">Or</div>
        <Button variant="outline" onClick={handleAnonymous}>
          Continue Anonymously
        </Button>
        <p className="text-xs">You can post, comment, and vote (but not create cells)</p>
      </DialogContent>
    </Dialog>
  );
}

// 2. Header with Call Sign Access
export function Header() {
  const { currentUser } = useAuth();
  const [callSignOpen, setCallSignOpen] = useState(false);
  
  return (
    <header>
      {currentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger>{currentUser.displayName}</DropdownMenuTrigger>
          <DropdownMenuContent>
            {currentUser.verificationStatus === EVerificationStatus.ANONYMOUS && (
              <DropdownMenuItem onClick={() => setCallSignOpen(true)}>
                {currentUser.callSign ? 'Update' : 'Set'} Call Sign
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>
              {currentUser.verificationStatus === EVerificationStatus.ANONYMOUS 
                ? 'Exit Anonymous' 
                : 'Disconnect'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      <CallSignSetupDialog open={callSignOpen} onOpenChange={setCallSignOpen} />
    </header>
  );
}

// 3. Author Display with Anonymous Support
export function AuthorDisplay({ address }: { address: string }) {
  const { displayName, callSign, ensName } = useUserDisplay(address);
  const isAnonymous = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(address);
  
  return (
    <div className="flex items-center gap-2">
      <span>{displayName}</span>
      
      {isAnonymous ? (
        callSign ? (
          <Badge className="bg-green-900/20"><Hash /> Call Sign</Badge>
        ) : (
          <Badge className="bg-neutral-800/50"><UserX /> Anonymous</Badge>
        )
      ) : (
        ensName && <Badge className="bg-green-900/20"><Crown /> ENS</Badge>
      )}
    </div>
  );
}

// 4. Inline Call Sign Input
export function InlineCallSignInput() {
  const { currentUser, updateProfile } = useAuth();
  const [callSign, setCallSign] = useState('');
  
  // Only show for anonymous users without call sign
  if (currentUser?.verificationStatus !== EVerificationStatus.ANONYMOUS || 
      currentUser?.callSign) {
    return null;
  }
  
  const handleSubmit = async () => {
    const success = await updateProfile({ callSign });
    if (success) {
      toast({ title: 'Call Sign Set!' });
    }
  };
  
  return (
    <div className="p-4 border rounded bg-muted">
      <p className="text-sm mb-3">Set a call sign to personalize your identity</p>
      <div className="flex gap-2">
        <Input 
          placeholder="your_call_sign" 
          value={callSign}
          onChange={(e) => setCallSign(e.target.value)}
          maxLength={20}
        />
        <Button onClick={handleSubmit}>Set Call Sign</Button>
      </div>
    </div>
  );
}

// 5. Permission-Based Content Forms
export function PostDetail({ postId }: { postId: string }) {
  const { permissions, currentUser } = useForum();
  const { createComment } = useContent();
  
  return (
    <div>
      {/* Post content */}
      
      {/* Call sign suggestion for anonymous users */}
      {currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS && 
       !currentUser.callSign && 
       permissions.canComment && (
        <InlineCallSignInput />
      )}
      
      {/* Comment form */}
      {permissions.canComment && (
        <CommentForm onSubmit={(content) => createComment({ postId, content })} />
      )}
      
      {/* Blocked state */}
      {!permissions.canComment && (
        <div>
          <p>Connect your wallet to comment</p>
          <Button>Connect Wallet</Button>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting Common Issues

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

### Error: Anonymous users can't interact after setting call sign

**Root Cause:** Verification status not preserved during profile updates.

**Solution:**
```tsx
// In updateProfile function
const updated: User = {
  ...user,
  ...identity,
  verificationStatus: user.verificationStatus, // Preserve!
};
```

## Testing Your Implementation

### Manual Test Checklist

**Anonymous Flow:**
- [ ] Can start anonymous session
- [ ] Can post without call sign
- [ ] Can comment without call sign
- [ ] Can vote without call sign
- [ ] Can set call sign from header
- [ ] Call sign appears in author display
- [ ] Session persists after call sign update
- [ ] Cannot create cells
- [ ] Can exit anonymous session

**Wallet Flow:**
- [ ] Can connect wallet
- [ ] ENS resolves automatically
- [ ] Can delegate browser keys
- [ ] Can create cells (if ENS verified)
- [ ] Can post without repeated signatures
- [ ] Can moderate own cells
- [ ] Can update profile
- [ ] Can disconnect wallet

**Edge Cases:**
- [ ] Anonymous user sets call sign → remains anonymous
- [ ] Wallet disconnects → doesn't clear anonymous users
- [ ] Profile update → preserves verification status
- [ ] Network disconnect → shows reconnect option
- [ ] Content pending → shows sync status

## Performance Optimization

1. **Memoization** - Use React.memo for expensive components
2. **Virtual Lists** - For long comment threads
3. **Lazy Loading** - Code-split routes
4. **Image Optimization** - Lazy load ENS avatars
5. **Bundle Size** - Tree-shake unused components

## Deployment

### Build Commands

```bash
# Build all packages
npm run build

# Build for production
cd app
npm run build
# Output: app/dist/
```

### Environment Variables

```bash
# .env.production
VITE_REOWN_SECRET=your_production_reown_id
```

### Static Hosting

Deploy `app/dist/` to:
- Vercel
- Netlify
- GitHub Pages
- IPFS

Configure SPA routing:
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## Summary

Building with `@opchan/react` requires understanding:

1. **Dual authentication model** - Anonymous and wallet modes
2. **Permission-based UI** - Show features based on capabilities
3. **Key delegation** - Browser keys reduce wallet friction
4. **Local-first architecture** - IndexedDB with network sync
5. **Real-time updates** - React state tied to network messages
6. **Identity flexibility** - Handle addresses, ENS, call signs, and sessions
7. **Verification preservation** - Critical for anonymous users
8. **Message verification** - Optional delegation proofs for protocol v2

Follow these patterns and you'll build a robust, user-friendly decentralized forum that works for everyone - from crypto natives to complete newcomers.

---

**For complete examples, see the reference implementation in `/app`**

