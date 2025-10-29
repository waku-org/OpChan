# OpChan - Decentralized Forum Application

A production-ready decentralized forum built on the Waku protocol with Ethereum wallet and anonymous session support. OpChan enables communities to create discussion boards (cells), share content, and engage in threaded conversations without centralized control.

## 🌟 Features

### Authentication & Identity
- ✅ **Multiple Auth Modes**
  - Anonymous sessions (browser-only, no wallet required)
  - Ethereum wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
  - ENS verification for premium features
- ✅ **Key Delegation** - One-time wallet signature, then browser signs all messages
- ✅ **Call Signs** - Custom usernames for both wallet and anonymous users
- ✅ **Identity Resolution** - Automatic ENS resolution and avatar display

### Content & Engagement
- ✅ **Cells (Forums)** - ENS holders create and moderate discussion boards
- ✅ **Posts & Comments** - Threaded discussions with markdown support
- ✅ **Voting System** - Upvote/downvote with verification-weighted relevance
- ✅ **Relevance Scoring** - Multi-factor algorithm prioritizing verified users
- ✅ **Bookmarks** - Local-only bookmarking of posts and comments
- ✅ **Moderation** - Cell-based moderation without global censorship

### Technical
- ✅ **Decentralized Messaging** - Waku protocol for P2P content distribution
- ✅ **Local-First** - IndexedDB caching with network sync
- ✅ **Cryptographic Verification** - Ed25519 signatures on all messages
- ✅ **Real-Time Updates** - Live content updates via Waku subscriptions

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/status-im/opchan.git
cd opchan

# Install dependencies
npm install

# Build packages
npm run build

# Start development server
cd app
npm run dev
```

### Environment Setup

Create `app/.env`:

```bash
VITE_REOWN_SECRET=your_reown_project_id
```

Get a Reown (formerly WalletConnect) project ID from https://cloud.reown.com

## 📖 Usage Guide

### For End Users

#### Getting Started - Anonymous Mode

1. **Visit the App** - No wallet required!
2. **Click "Connect"** in the header
3. **Select "Continue Anonymously"**
4. **Set a Call Sign** - From header dropdown menu
5. **Start Engaging** - Post, comment, and vote immediately

#### Getting Started - Wallet Mode

1. **Click "Connect"** and choose your wallet
2. **Complete Setup Wizard**:
   - Step 1: Connect wallet
   - Step 2: Verify ENS ownership (optional)
   - Step 3: Delegate browser key (recommended)
3. **Create or Join Cells**
4. **Engage with Content**

#### Permission Levels

| Action | Anonymous | Wallet Connected | ENS Verified |
|--------|-----------|------------------|--------------|
| View Content | ✅ | ✅ | ✅ |
| Upvote/Downvote | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| Create Posts | ✅ | ✅ | ✅ |
| Create Cells | ❌ | ❌ | ✅ |
| Moderate | ❌ | ❌ | ✅ (Own cells) |
| Set Call Sign | ✅ | ✅ | ✅ |

### For Developers

#### Building with @opchan/react

See `packages/react/README.md` for complete API documentation.

**Basic Example:**

```tsx
import { useForum } from '@opchan/react';

export function MyForumComponent() {
  const { user, content, permissions } = useForum();
  
  const handleCreatePost = async () => {
    if (!permissions.canPost) return;
    
    const post = await content.createPost({
      cellId: 'cell-id',
      title: 'Hello World',
      content: 'My first post!'
    });
    
    if (post) {
      console.log('Post created:', post.id);
    }
  };
  
  return (
    <div>
      {user.currentUser ? (
        <button onClick={handleCreatePost}>Create Post</button>
      ) : (
        <>
          <button onClick={user.connect}>Connect Wallet</button>
          <button onClick={user.startAnonymous}>Go Anonymous</button>
        </>
      )}
    </div>
  );
}
```

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   useAuth   │  │  useContent  │  │  usePermissions  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         │                 │                    │             │
│         └─────────────────┴────────────────────┘             │
│                           │                                  │
│                    @opchan/react                             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      @opchan/core                            │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ OpChanClient │──│ ForumActions│  │ DelegationManager│   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
│         │                 │                    │             │
│  ┌──────┴─────┐    ┌──────┴────────┐   ┌──────┴──────┐     │
│  │ LocalDB    │    │ MessageManager │   │ Crypto Utils│     │
│  │ (IndexedDB)│    │  (Waku)       │   │ (ed25519)   │     │
│  └────────────┘    └───────────────┘   └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Authentication System

```
┌─ Anonymous Flow ─────────────────────────────────────────┐
│ 1. startAnonymous()                                       │
│ 2. Generate browser keypair (ed25519)                     │
│ 3. Store as AnonymousDelegation (sessionId + keys)        │
│ 4. User can interact immediately                          │
│ 5. Optional: Set call sign                                │
└───────────────────────────────────────────────────────────┘

┌─ Wallet Flow ────────────────────────────────────────────┐
│ 1. connect() → Wallet connection via wagmi                │
│ 2. verifyOwnership() → Check for ENS (optional)           │
│ 3. delegate('7days') → Wallet signs browser key auth      │
│ 4. Browser signs all subsequent messages                  │
│ 5. Messages include delegationProof (wallet signature)    │
└───────────────────────────────────────────────────────────┘
```

### Message Flow

```
Create Content → Sign with Browser Key → Broadcast to Waku → Peers Verify → Store in Local Cache
     ↓                     ↓                    ↓                   ↓                ↓
  User Action    DelegationManager    MessageManager    MessageValidator    LocalDatabase
                                                               ↓
                                           ┌───────────────────┴──────────────────┐
                                           │                                       │
                                    Wallet Users:                         Anonymous Users:
                               Verify delegationProof                 Verify session ID format
                               (wallet signature)                    (UUID pattern check)
```

### Data Layer

- **IndexedDB Stores**: cells, posts, comments, votes, moderations, userIdentities, delegation, bookmarks
- **Caching Strategy**: Write-through cache with optimistic updates
- **Sync Strategy**: Waku messages update local cache, triggers React re-renders
- **Persistence**: All user data persisted locally, nothing on centralized servers

## 🎨 UI/UX Design

### Design System

- **Theme**: Cyberpunk-inspired dark theme
- **Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Typography**: Monospace fonts for technical aesthetic
- **Colors**: Cyan accent, dark backgrounds, high contrast

### Key Components

- `<Header />` - Navigation, auth status, network indicator
- `<WalletWizard />` - 3-step onboarding flow
- `<CallSignSetupDialog />` - Call sign configuration
- `<AuthorDisplay />` - User identity with badges (ENS, Call Sign, Anonymous)
- `<RelevanceIndicator />` - Visual relevance score display
- `<MarkdownInput />` & `<MarkdownRenderer />` - Rich text support

## 🔐 Security Model

### Cryptographic Trust Chain

```
Wallet Users:
  Wallet Private Key (user device)
    → Signs delegation authorization
    → Authorizes Browser Private Key
    → Browser signs all messages
    → Messages include delegationProof
    → Peers verify wallet signature on delegationProof

Anonymous Users:
  Browser Private Key (generated locally)
    → Signs all messages directly
    → No wallet proof required
    → Peers verify session ID format
    → Lower trust/relevance weight
```

### Security Guarantees

- ✅ All messages cryptographically signed (ed25519)
- ✅ Message authorship verifiable by any peer
- ✅ Delegation proofs prevent impersonation
- ✅ Session IDs prevent anonymous user collisions
- ✅ Browser keys never leave device
- ✅ No centralized authentication server

### Spam Prevention

- Anonymous users have lower relevance weights
- Cell admins can moderate any content
- Moderated content hidden by default
- Time decay reduces old content relevance

## 📊 Relevance Algorithm

Content is scored based on multiple factors:

```
Base Score (Post: 10, Comment: 5, Cell: 15)
+ Engagement (upvotes × 1, comments × 0.5)
+ Author Verification Bonus (ENS: +25%, Wallet: +10%)
+ Verified Upvote Bonus (+0.1 per verified upvoter)
+ Verified Commenter Bonus (+0.05 per verified commenter)
× Time Decay (exponential, λ=0.1)
× Moderation Penalty (0.5 if moderated)
= Final Relevance Score
```

Anonymous users:
- Get **no verification bonus**
- Their votes count but with **no verified upvote bonus** to others
- Can still create popular content through engagement

## 🛠️ Development

### Project Structure

```
app/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components + custom
│   │   │   ├── wallet-wizard.tsx  # 3-step onboarding
│   │   │   ├── author-display.tsx # User identity display
│   │   │   ├── inline-callsign-input.tsx # Anonymous call sign
│   │   │   └── ...
│   │   ├── Header.tsx             # Main navigation
│   │   ├── PostList.tsx           # Post feed
│   │   ├── PostDetail.tsx         # Single post view
│   │   ├── CommentCard.tsx        # Comment display
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.tsx          # Landing page
│   │   ├── CellPage.tsx           # Cell view
│   │   ├── PostPage.tsx           # Post view
│   │   ├── ProfilePage.tsx        # User profile
│   │   └── ...
│   ├── hooks/
│   │   └── index.ts               # Re-exports from @opchan/react
│   └── utils/
│       ├── sorting.ts             # Content sorting utilities
│       └── ...
└── package.json
```

### Building from Source

```bash
# Build all packages
npm run build

# Build individual packages
cd packages/core && npm run build
cd packages/react && npm run build
cd app && npm run build

# Development mode (with hot reload)
cd app && npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run specific tests
cd packages/core && npm test
```

## 🌐 Deployment

### Build for Production

```bash
cd app
npm run build
# Output in app/dist/
```

### Deploy to Vercel/Netlify

The app is a static SPA that can be deployed to any static hosting:

```json
// vercel.json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

Environment variables required:
- `VITE_REOWN_SECRET` - Reown project ID for WalletConnect

## 📚 Key Learnings & Implementation Notes

### Why Anonymous Support?

From FURPS requirement #18: "Anonymous users can upvote, comments and post"

Benefits:
- **Lower barrier to entry** - Users can try before connecting wallet
- **Privacy-preserving** - No on-chain footprint required
- **Better adoption** - Immediate engagement without Web3 knowledge
- **Flexible identity** - Users can upgrade to wallet later

### Why Key Delegation?

- **UX Problem**: Signing every message with wallet is tedious
- **Solution**: Wallet signs once to authorize browser keys
- **Result**: Seamless posting/commenting without wallet prompts
- **Security**: Delegation expires (7-30 days), can be revoked anytime

### Why Local-First?

- **Resilience**: App works offline, syncs when online
- **Performance**: Instant UI updates, background network sync
- **Privacy**: All data local until shared on network
- **Decentralization**: No centralized API dependency

## 🐛 Common Issues & Solutions

### Issue: Anonymous user loses session after interaction
**Solution**: Ensure wallet sync effect preserves anonymous users (check `verificationStatus !== ANONYMOUS`)

### Issue: Call sign update clears anonymous session
**Solution**: Preserve `verificationStatus` in `updateProfile` and add `ANONYMOUS` case to `mapVerificationStatus`

### Issue: Permissions show false for anonymous users
**Solution**: Update permission checks to include `isAnonymous` condition

### Issue: Wizard loops anonymous users through verification steps
**Solution**: Close wizard immediately after anonymous selection (check `verificationStatus` in `handleStepComplete`)

## 🔮 Future Enhancements

- [ ] Multi-wallet support (Bitcoin, Solana)
- [ ] ENS avatar display improvements
- [ ] Content persistence strategies
- [ ] Rate limiting for anonymous users
- [ ] Advanced moderation tools
- [ ] Search functionality
- [ ] Notifications system
- [ ] Mobile app (React Native)

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create branch**: `git checkout -b feature/my-feature`
3. **Make changes** following existing patterns
4. **Test thoroughly** - especially authentication flows
5. **Build all packages**: `npm run build` from root
6. **Commit**: `git commit -m "feat: add my feature"`
7. **Push**: `git push origin feature/my-feature`
8. **Open PR** with description

### Code Style

- TypeScript strict mode
- No `any` types (use proper typing)
- Functional components with hooks
- Tailwind CSS for styling
- shadcn/ui component patterns

## 📄 License

MIT

## 🙏 Acknowledgments

Built on:
- [Waku Protocol](https://waku.org) - Decentralized messaging
- [Viem](https://viem.sh) - Ethereum interactions
- [Wagmi](https://wagmi.sh) - React hooks for Ethereum
- [shadcn/ui](https://ui.shadcn.com) - Component library
- [Tailwind CSS](https://tailwindcss.com) - Styling

---

**OpChan - Decentralized communities built on cryptographic trust, not corporate servers** 🌐
