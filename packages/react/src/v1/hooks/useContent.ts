import React from 'react';
import { useClient } from '../context/ClientContext';
import { useOpchanStore, setOpchanState } from '../store/opchanStore';
import {
  PostMessage,
  CommentMessage,
  Post,
  Comment,
  Cell,
  EVerificationStatus,
  UserVerificationStatus,
  BookmarkType,
} from '@opchan/core';
import { BookmarkService } from '@opchan/core';

function reflectCache(client: ReturnType<typeof useClient>): void {
  const cache = client.database.cache;
  setOpchanState(prev => ({
    ...prev,
    content: {
      ...prev.content,
      cells: Object.values(cache.cells),
      posts: Object.values(cache.posts),
      comments: Object.values(cache.comments),
      bookmarks: Object.values(cache.bookmarks),
      lastSync: client.database.getSyncState().lastSync,
      pendingIds: prev.content.pendingIds,
      pendingVotes: prev.content.pendingVotes,
    },
  }));
}

export function useContent() {
  const client = useClient();
  const content = useOpchanStore(s => s.content);
  const session = useOpchanStore(s => s.session);

  // Re-render on pending changes from LocalDatabase so isPending reflects current state
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const off = client.database.onPendingChange(() => {
      forceRender();
    });
    return () => {
        try {
          off();
        } catch (err) {
          console.error('Error cleaning up pending change listener:', err);
        }
    };
  }, [client]);

  // Derived maps
  const postsByCell = React.useMemo(() => {
    const map: Record<string, PostMessage[]> = {};
    for (const p of content.posts) {
      (map[p.cellId] ||= []).push(p);
    }
    return map;
  }, [content.posts]);

  const commentsByPost = React.useMemo(() => {
    const map: Record<string, CommentMessage[]> = {};
    for (const c of content.comments) {
      (map[c.postId] ||= []).push(c);
    }
    return map;
  }, [content.comments]);

  // Derived: user verification status from identity cache
  const userVerificationStatus: UserVerificationStatus = React.useMemo(() => {
    const identities = client.database.cache.userIdentities;
    const result: UserVerificationStatus = {};
    for (const [address, rec] of Object.entries(identities)) {
      const hasEns = Boolean(rec.ensName);
      const hasOrdinal = Boolean(rec.ordinalDetails);
      const isVerified = rec.verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;
      result[address] = {
        isVerified,
        hasENS: hasEns,
        hasOrdinal,
        ensName: rec.ensName,
        verificationStatus: rec.verificationStatus,
      };
    }
    return result;
  }, [client.database.cache.userIdentities]);

  // Derived: cells with stats for sidebar/trending
  const cellsWithStats = React.useMemo(() => {
    const byCell: Record<string, { postCount: number; activeUsers: Set<string>; recentActivity: number }> = {};
    const now = Date.now();
    const recentWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const p of content.posts) {
      const entry = (byCell[p.cellId] ||= { postCount: 0, activeUsers: new Set<string>(), recentActivity: 0 });
      entry.postCount += 1;
      entry.activeUsers.add(p.author);
      if (now - p.timestamp <= recentWindowMs) entry.recentActivity += 1;
    }
    for (const c of content.comments) {
      // find post for cell reference
      const post = content.posts.find(pp => pp.id === c.postId);
      if (!post) continue;
      const entry = (byCell[post.cellId] ||= { postCount: 0, activeUsers: new Set<string>(), recentActivity: 0 });
      entry.activeUsers.add(c.author);
      if (now - c.timestamp <= recentWindowMs) entry.recentActivity += 1;
    }
    return content.cells.map(cell => {
      const stats = byCell[cell.id] || { postCount: 0, activeUsers: new Set<string>(), recentActivity: 0 };
      return {
        ...cell,
        postCount: stats.postCount,
        activeUsers: stats.activeUsers.size,
        recentActivity: stats.recentActivity,
      } as Cell & { postCount: number; activeUsers: number; recentActivity: number };
    });
  }, [content.cells, content.posts, content.comments]);

  // Actions
  const createCell = React.useCallback(async (input: { name: string; description: string; icon?: string }): Promise<Cell | null> => {
    const currentUser = session.currentUser;
    const isAuthenticated = Boolean(currentUser);
    const result = await client.forumActions.createCell(
      { ...input, currentUser, isAuthenticated },
      () => reflectCache(client)
    );
    reflectCache(client);
    return result.data ?? null;
  }, [client, session.currentUser]);

  const createPost = React.useCallback(async (input: { cellId: string; title: string; content: string }): Promise<Post | null> => {
    const currentUser = session.currentUser;
    const isAuthenticated = Boolean(currentUser);
    const result = await client.forumActions.createPost(
      { ...input, currentUser, isAuthenticated },
      () => reflectCache(client)
    );
    reflectCache(client);
    return result.data ?? null;
  }, [client, session.currentUser]);

  const createComment = React.useCallback(async (input: { postId: string; content: string }): Promise<Comment | null> => {
    const currentUser = session.currentUser;
    const isAuthenticated = Boolean(currentUser);
    const result = await client.forumActions.createComment(
      { ...input, currentUser, isAuthenticated },
      () => reflectCache(client)
    );
    reflectCache(client);
    return result.data ?? null;
  }, [client, session.currentUser]);

  const vote = React.useCallback(async (input: { targetId: string; isUpvote: boolean }): Promise<boolean> => {
    const currentUser = session.currentUser;
    const isAuthenticated = Boolean(currentUser);
    const result = await client.forumActions.vote(
      { ...input, currentUser, isAuthenticated },
      () => reflectCache(client)
    );
    reflectCache(client);
    return result.data ?? false;
  }, [client, session.currentUser]);

  const moderate = React.useMemo(() => ({
    post: async (cellId: string, postId: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.moderatePost(
        { cellId, postId, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
    unpost: async (cellId: string, postId: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.unmoderatePost(
        { cellId, postId, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
    comment: async (cellId: string, commentId: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.moderateComment(
        { cellId, commentId, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
    uncomment: async (cellId: string, commentId: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.unmoderateComment(
        { cellId, commentId, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
    user: async (cellId: string, userAddress: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.moderateUser(
        { cellId, userAddress, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
    unuser: async (cellId: string, userAddress: string, reason?: string) => {
      const currentUser = session.currentUser;
      const isAuthenticated = Boolean(currentUser);
      const cell = content.cells.find(c => c.id === cellId);
      const res = await client.forumActions.unmoderateUser(
        { cellId, userAddress, reason, currentUser, isAuthenticated, cellOwner: cell?.author ?? '' },
        () => reflectCache(client)
      );
      reflectCache(client);
      return res.data ?? false;
    },
  }), [client, session.currentUser, content.cells]);

  const togglePostBookmark = React.useCallback(async (post: Post | PostMessage, cellId?: string): Promise<boolean> => {
    const address = session.currentUser?.address;
    if (!address) return false;
    const added = await BookmarkService.togglePostBookmark(post as Post, address, cellId);
    const updated = await client.database.getUserBookmarks(address);
    setOpchanState(prev => ({ ...prev, content: { ...prev.content, bookmarks: updated } }));
    return added;
  }, [client, session.currentUser?.address]);

  const toggleCommentBookmark = React.useCallback(async (comment: Comment | CommentMessage, postId?: string): Promise<boolean> => {
    const address = session.currentUser?.address;
    if (!address) return false;
    const added = await BookmarkService.toggleCommentBookmark(comment as Comment, address, postId);
    const updated = await client.database.getUserBookmarks(address);
    setOpchanState(prev => ({ ...prev, content: { ...prev.content, bookmarks: updated } }));
    return added;
  }, [client, session.currentUser?.address]);

  const removeBookmark = React.useCallback(async (bookmarkId: string): Promise<void> => {
    const address = session.currentUser?.address;
    if (!address) return;
    const [typeStr, targetId] = bookmarkId.split(':');
    const type = typeStr === 'post' ? BookmarkType.POST : BookmarkType.COMMENT;
    await BookmarkService.removeBookmark(type, targetId);
    const updated = await client.database.getUserBookmarks(address);
    setOpchanState(prev => ({ ...prev, content: { ...prev.content, bookmarks: updated } }));
  }, [client, session.currentUser?.address]);

  const clearAllBookmarks = React.useCallback(async (): Promise<void> => {
    const address = session.currentUser?.address;
    if (!address) return;
    await BookmarkService.clearUserBookmarks(address);
    const updated = await client.database.getUserBookmarks(address);
    setOpchanState(prev => ({ ...prev, content: { ...prev.content, bookmarks: updated } }));
  }, [client, session.currentUser?.address]);

  const refresh = React.useCallback(async () => {
    // Minimal refresh: re-reflect cache; network refresh is via useNetwork
    reflectCache(client);
  }, [client]);

  return {
    // data
    cells: content.cells,
    posts: content.posts,
    comments: content.comments,
    bookmarks: content.bookmarks,
    postsByCell,
    commentsByPost,
    cellsWithStats,
    userVerificationStatus,
    pending: {
      isPending: (id?: string) => (id ? client.database.isPending(id) : false),
      onChange: (cb: () => void) => client.database.onPendingChange(cb),
    },
    lastSync: content.lastSync,
    // actions
    createCell,
    createPost,
    createComment,
    vote,
    moderate,
    togglePostBookmark,
    toggleCommentBookmark,
    removeBookmark,
    clearAllBookmarks,
    refresh,
  } as const;
}




