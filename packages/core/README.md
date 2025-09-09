# @opchan/core

Core package for OpChan - A decentralized forum built on Bitcoin Ordinals and Waku protocol.

## Features

- **Waku Integration**: Complete Waku protocol implementation for decentralized messaging
- **Bitcoin/Ethereum Wallet Support**: Multi-chain wallet integration with Reown AppKit
- **Forum Operations**: Cell creation, posts, comments, and voting system
- **Relevance Scoring**: Sophisticated algorithm for content ranking
- **Moderation System**: Cell-based moderation capabilities
- **Key Delegation**: Browser key generation for improved UX
- **Local Storage**: IndexedDB integration for offline-first experience
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @opchan/core
```

## Usage

### Basic Setup

```typescript
import { WakuNodeManager, ForumActions, LocalDatabase } from '@opchan/core';

// Initialize Waku node
const wakuManager = new WakuNodeManager();
await wakuManager.initialize();

// Initialize local database
const db = new LocalDatabase();
await db.initialize();

// Create forum actions
const forumActions = new ForumActions(wakuManager, db);
```

### Creating a Cell

```typescript
import { ForumActions } from '@opchan/core';

const cell = await forumActions.createCell(
  'My Cell',
  'Description of my cell',
  'https://example.com/icon.png' // optional
);
```

### Creating Posts and Comments

```typescript
// Create a post
const post = await forumActions.createPost(
  cellId,
  'Post Title',
  'Post content here'
);

// Create a comment
const comment = await forumActions.createComment(
  postId,
  'Comment content here'
);
```

### Voting System

```typescript
// Vote on a post
await forumActions.votePost(postId, true); // upvote
await forumActions.votePost(postId, false); // downvote

// Vote on a comment
await forumActions.voteComment(commentId, true);
```

### Wallet Integration

```typescript
import { createWalletConfig } from '@opchan/core/wallet';

const config = createWalletConfig({
  projectId: 'your-project-id',
  // ... other wallet configuration
});
```

## API Reference

### Core Classes

- **WakuNodeManager**: Manages Waku node lifecycle and connections
- **ForumActions**: Handles all forum operations (create, vote, moderate)
- **LocalDatabase**: IndexedDB wrapper for local data persistence
- **RelevanceCalculator**: Calculates content relevance scores
- **BookmarkService**: Manages user bookmarks
- **UserIdentityService**: Handles user identity and verification

### Types

- **Cell**: Forum cell/board structure
- **Post**: Forum post structure
- **Comment**: Comment structure
- **User**: User identity and verification status
- **Vote**: Voting system types

## Requirements

- Node.js 18+
- Modern browser with IndexedDB support
- Bitcoin or Ethereum wallet (for posting)

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Support

For questions and support, please open an issue on our GitHub repository.
