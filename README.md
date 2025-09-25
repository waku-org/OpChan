# Opchan

TypeScript libraries for building decentralized, Waku-powered forums.

## Packages

- `@opchan/core` – Core browser library: Waku messaging, local database, identity/ENS & Ordinals resolution, delegation, and forum actions.
- `@opchan/react` – React provider and hooks on top of `@opchan/core`.

## Install

```bash
# core only
npm i @opchan/core

# react integration
npm i @opchan/react @opchan/core react react-dom
```

## Quickstart

### React

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OpChanProvider, useForum } from '@opchan/react';

const config = { ordiscanApiKey: 'YOUR_ORDISCAN_API_KEY' };

function NewPostButton({ cellId }: { cellId: string }) {
  const { content, permissions } = useForum();
  return (
    <button
      disabled={!permissions.canPost}
      onClick={() => content.createPost({ cellId, title: 'Hello', content: 'World' })}
    >
      New post
    </button>
  );
}

function App() {
  return (
    <OpChanProvider config={config}>
      <NewPostButton cellId="general" />
    </OpChanProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
```

More details:
- React API docs: `packages/react/README.md`

## Development

This is an npm workspace. From the repo root:

```bash
# install all deps
npm install

# build all packages
npm run build

# build a specific package
npm run build --workspace=@opchan/core
npm run build --workspace=@opchan/react

# watch mode during development
npm run dev --workspace=@opchan/core
npm run dev --workspace=@opchan/react

# test & lint
npm test
npm run lint
```

## License

MIT