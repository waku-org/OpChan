# Opchan

A TypeScript browser library workspace.

## Structure

This is an npm workspace containing:

- `@opchan/core` - Core browser library package

## Development

### Installation

```bash
npm install
```

### Building

Build all packages:
```bash
npm run build
```

Build specific package:
```bash
npm run build --workspace=@opchan/core
```

### Development Mode

Watch mode for development:
```bash
npm run dev --workspace=@opchan/core
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Usage

```typescript
import { Opchan } from '@opchan/core';

const opchan = new Opchan({
  debug: true,
  version: '1.0.0'
});

console.log(opchan.getVersion()); // "1.0.0"
opchan.log('Hello from Opchan!'); // [Opchan] Hello from Opchan!
```

## Packages

### @opchan/core

The core browser library providing the main functionality.

## License

MIT