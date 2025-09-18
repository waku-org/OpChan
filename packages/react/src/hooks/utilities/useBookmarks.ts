import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../contexts/ClientContext';
import { Bookmark, BookmarkType, Post, Comment } from '@opchan/core';
import { BookmarkService } from '@opchan/core';

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  getBookmarksByType: (type: BookmarkType) => Bookmark[];
  removeBookmark: (bookmark: Bookmark) => Promise<void>;
  clearAllBookmarks: () => Promise<void>;
  togglePostBookmark: (post: Post, cellId?: string) => Promise<boolean>;
  toggleCommentBookmark: (comment: Comment, postId?: string) => Promise<boolean>;
}

export function useBookmarks(): UseBookmarksReturn {
  const { currentUser } = useAuth();
  const client = useClient();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser?.address) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await client.database.getUserBookmarks(currentUser.address);
      setBookmarks(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [client.database, currentUser?.address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getBookmarksByType = useCallback(
    (type: BookmarkType): Bookmark[] =>
      bookmarks.filter(b => b.type === type),
    [bookmarks]
  );

  const removeBookmark = useCallback(
    async (bookmark: Bookmark): Promise<void> => {
      await BookmarkService.removeBookmark(bookmark.type, bookmark.targetId);
      await refresh();
    },
    [refresh]
  );

  const clearAllBookmarks = useCallback(async (): Promise<void> => {
    if (!currentUser?.address) return;
    await BookmarkService.clearUserBookmarks(currentUser.address);
    await refresh();
  }, [currentUser?.address, refresh]);

  const togglePostBookmark = useCallback(
    async (post: Post, cellId?: string): Promise<boolean> => {
      if (!currentUser?.address) return false;
      const added = await BookmarkService.togglePostBookmark(
        post,
        currentUser.address,
        cellId
      );
      await refresh();
      return added;
    },
    [currentUser?.address, refresh]
  );

  const toggleCommentBookmark = useCallback(
    async (comment: Comment, postId?: string): Promise<boolean> => {
      if (!currentUser?.address) return false;
      const added = await BookmarkService.toggleCommentBookmark(
        comment,
        currentUser.address,
        postId
      );
      await refresh();
      return added;
    },
    [currentUser?.address, refresh]
  );

  return useMemo(
    () => ({
      bookmarks,
      loading,
      error,
      getBookmarksByType,
      removeBookmark,
      clearAllBookmarks,
      togglePostBookmark,
      toggleCommentBookmark,
    }),
    [
      bookmarks,
      loading,
      error,
      getBookmarksByType,
      removeBookmark,
      clearAllBookmarks,
      togglePostBookmark,
      toggleCommentBookmark,
    ]
  );
}

// Optional convenience hooks to match historic API surface
export function usePostBookmark() {
  const { togglePostBookmark } = useBookmarks();
  return { togglePostBookmark };
}

export function useCommentBookmark() {
  const { toggleCommentBookmark } = useBookmarks();
  return { toggleCommentBookmark };
}


