# Minimal SDS Integration Test Plan

## Overview
This branch implements a minimal proof-of-concept for SDS (Scalable Data Sync) integration in OpChan, focusing exclusively on vote consistency.

## What Changed

### 1. Core SDS Implementation
- **New Package**: Added `@waku/sds` dependency
- **MinimalSDSWrapper**: Basic implementation at `src/lib/waku/sds/minimal-sds.ts`
  - Manages Lamport timestamps for causal ordering
  - Tracks causal history (last 3 message IDs)
  - Provides `isCausallyNewer()` comparison

### 2. Vote Message Enhancement
- Vote messages now include SDS metadata:
  ```typescript
  {
    sds: {
      channelId: "opchan:votes:all",
      lamportTimestamp: number,
      causalHistory: string[]
    }
  }
  ```

### 3. Conflict Resolution
- When receiving votes, the system now:
  1. Checks if a vote already exists for the same target+author
  2. Uses Lamport timestamps to determine which is newer
  3. Only updates if the incoming vote is causally newer
  4. Logs all decisions for debugging

### 4. Visual Indicators
- Added SDS status badge in header showing "SDS: Active (Votes)"
- Debug console logs show SDS operations

## Test Scenarios

### Scenario 1: Basic Vote Ordering
1. User A upvotes a post
2. User A changes to downvote
3. Verify the downvote is applied (newer Lamport timestamp)

### Scenario 2: Concurrent Votes
1. Open two browser tabs with same wallet
2. Vote differently in each tab quickly
3. Verify the last vote wins based on causal ordering

### Scenario 3: Network Delays
1. Vote on a post
2. Disconnect network
3. Change vote
4. Reconnect
5. Verify votes are ordered correctly when synced

### Scenario 4: Vote History
1. Vote multiple times on same content
2. Check console logs for SDS debug messages
3. Verify causal history is maintained

## Debug Output

Enable browser console to see SDS operations:
```
[SDS HH:MM:SS] VOTE SENDING - postId:userAddress
[SDS HH:MM:SS] VOTE NEW - postId:userAddress
[SDS HH:MM:SS] VOTE UPDATED - postId:userAddress (old: 5, new: 7)
[SDS HH:MM:SS] VOTE IGNORED_OLDER - postId:userAddress
```

## Verification

### Console Commands
```javascript
// Check current vote state
messageManager.messageCache.votes

// Check if message has SDS metadata
messageManager.messageCache.votes['postId:address'].sds
```

### Expected Behavior
- Votes should never "flip back" to older states
- Lamport timestamps should increase monotonically
- Causal history should contain previous vote IDs

## Limitations

This minimal implementation:
- Only applies to votes (not posts, comments, or moderation)
- Uses a single channel for all votes (not optimal for scale)
- Doesn't implement full SDS features (sync messages, bloom filters)
- No persistence of SDS state between sessions

## Next Steps

If this test is successful:
1. Extend to comments for thread ordering
2. Add per-cell channels for better scalability
3. Implement sync messages for reliability
4. Add persistence of channel state
5. Implement gap detection and recovery