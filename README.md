# OpChan

A decentralized forum application built as a Proof of Concept for a Waku-powered discussion platform. OpChan enables users to create "cells" (discussion boards), make posts, and engage in threaded conversations using Bitcoin Ordinal verification and the Waku protocol for decentralized messaging.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- [Phantom Wallet](https://phantom.app/) browser extension
- Bitcoin Ordinals (required for posting, optional for reading)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/waku-org/OpChan.git
   cd OpChan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to configure development settings:
   ```env
   # Set to 'true' to bypass verification in development
   VITE_OPCHAN_MOCK_ORDINAL_CHECK=false
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui component library
│   ├── ActivityFeed.tsx
│   ├── CellPage.tsx
│   ├── Dashboard.tsx
│   └── ...
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Wallet & authentication
│   ├── ForumContext.tsx # Forum data & state
│   └── forum/          # Forum logic modules
├── lib/                # Core libraries
│   ├── identity/       # Wallet & cryptographic operations
│   ├── waku/          # Waku protocol integration
│   └── utils.ts
├── pages/             # Route components
└── types/             # TypeScript definitions
```

## Usage

### Getting Started

1. **Connect Wallet**: Click "Connect Wallet" and approve the Phantom wallet connection
2. **Verify Ordinals**: The app will check if your wallet contains Logos Operator Bitcoin Ordinals
3. **Browse Cells**: View existing discussion boards on the dashboard
4. **Create Content**: Create new cells, posts, or comments (requires Ordinals)
5. **Moderate**: Cell creators can moderate their boards

### Authentication Flow

OpChan uses a two-tier authentication system:

1. **Wallet Connection**: Initial connection to Phantom wallet
2. **Key Delegation**: Optional browser key generation for improved UX
   - Reduces wallet signature prompts
   - Configurable duration: 1 week or 30 days
   - Can be regenerated anytime

### Network & Performance

- **Waku Network**: Connects to multiple bootstrap nodes for resilience
- **Message Caching**: Local caching with IndexedDB (planned)
- **Time-bounded Queries**: 24-hour query windows to prevent database overload
- **Pagination**: 50 messages per query with fallback limits

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the existing code style
4. Test your changes thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## TODOs
- [x] replace mock wallet connection/disconnection
  - supports Phantom
- [x] replace mock Ordinal verification (API)
- [ ] figure out using actual icons for cells
- [ ] store message cache in indexedDB -- make app local-first (update from/to Waku when available)
- [ ] moderation
  - [ ] admins can "moderate" comments/posts

## Architecture

OpChan implements a decentralized architecture with these key components:

- **Waku Protocol**: Handles peer-to-peer messaging and content distribution
- **Bitcoin Ordinals**: Provides decentralized identity verification
- **Key Delegation**: Improves UX while maintaining security
- **Content Addressing**: Messages are cryptographically signed and verifiable
- **Moderation Layer**: Cell-based moderation without global censorship


## Support

For questions, issues, or contributions:

- Open an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information for bug reports
- Include steps to reproduce issues

---

**Note**: This is a Proof of Concept implementation. Use at your own risk in production environments.